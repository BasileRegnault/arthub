<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Service pour récupérer des données depuis l'API de l'Art Institute of Chicago.
 */
class ArtInstituteApiService
{
    private const BASE_URL = 'https://api.artic.edu/api/v1';
    private const IIIF_URL = 'https://www.artic.edu/iiif/2';

    private const ARTWORK_FIELDS = [
        'id',
        'title',
        'artist_id',
        'artist_title',
        'date_display',
        'artwork_type_title',
        'style_title',
        'description',
        'image_id',
        'place_of_origin',
    ];

    public function __construct(
        private HttpClientInterface $httpClient,
    ) {}

    /**
     * Récupère une page d'œuvres depuis l'API, en utilisant la recherche Elasticsearch
     * pour filtrer par type d'œuvre supporté.
     *
     * @return array{data: array, pagination: array}
     */
    public function fetchArtworks(int $limit = 50, int $page = 1): array
    {
        $response = $this->httpClient->request('GET', self::BASE_URL . '/artworks/search', [
            'query' => [
                'fields' => implode(',', self::ARTWORK_FIELDS),
                'limit' => $limit,
                'page' => $page,
                'query[bool][must][][term][artwork_type_title.keyword]' => 'Painting',
            ],
            'headers' => [
                'Accept' => 'application/json',
            ],
        ]);

        return $response->toArray();
    }

    /**
     * Récupère des œuvres filtrées par type via l'endpoint de recherche.
     *
     * @param string[] $types Types d'œuvres à récupérer (ex: ["Painting", "Sculpture"])
     * @return array{data: array, pagination: array}
     */
    public function searchArtworks(int $limit = 50, int $page = 1, array $types = ['Painting']): array
    {
        // Utilise l'endpoint de recherche avec un filtre Elasticsearch
        $body = [
            'query' => [
                'bool' => [
                    'must' => [
                        ['terms' => ['artwork_type_title.keyword' => $types]],
                        ['exists' => ['field' => 'image_id']],
                        ['exists' => ['field' => 'artist_title']],
                        ['exists' => ['field' => 'description']],
                    ],
                ],
            ],
            'fields' => self::ARTWORK_FIELDS,
            'limit' => $limit,
            'page' => $page,
        ];

        $response = $this->httpClient->request('POST', self::BASE_URL . '/artworks/search', [
            'json' => $body,
        ]);

        return $response->toArray();
    }

    /**
     * Construit l'URL IIIF pour une image.
     */
    public function getImageUrl(string $imageId, int $width = 843): string
    {
        return sprintf('%s/%s/full/%d,/0/default.jpg', self::IIIF_URL, $imageId, $width);
    }

    /**
     * Télécharge une image et retourne son contenu binaire, ou null en cas d'erreur.
     */
    public function downloadImage(string $imageId): ?string
    {
        try {
            $url = $this->getImageUrl($imageId);
            $response = $this->httpClient->request('GET', $url, [
                'headers' => [
                    'User-Agent' => 'ArtHub/1.0 (Symfony; Educational Project)',
                ],
            ]);

            if ($response->getStatusCode() !== 200) {
                return null;
            }

            return $response->getContent();
        } catch (\Throwable) {
            return null;
        }
    }
}
