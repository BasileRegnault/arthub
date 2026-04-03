<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Service pour récupérer des données depuis l'API Wikipedia REST.
 * Utilisé principalement pour obtenir les portraits des artistes.
 */
class WikipediaApiService
{
    private const SUMMARY_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

    public function __construct(
        private HttpClientInterface $httpClient,
    ) {}

    /**
     * Retourne l'URL du portrait Wikipedia d'un artiste, ou null si introuvable.
     */
    public function getArtistThumbnail(string $artistName): ?string
    {
        // Formater le nom pour l'URL Wikipedia (espaces → underscores)
        $slug = str_replace(' ', '_', trim($artistName));

        try {
            $response = $this->httpClient->request('GET', self::SUMMARY_URL . urlencode($slug), [
                'headers' => [
                    'Accept' => 'application/json',
                    'User-Agent' => 'ArtHub/1.0 (Symfony; Educational Project; contact@arthubb.fr)',
                ],
                'timeout' => 5,
            ]);

            if ($response->getStatusCode() !== 200) {
                return null;
            }

            $data = $response->toArray();

            // Vérifier que la page est bien une personne (pour éviter les faux positifs)
            $type = $data['type'] ?? '';
            if (!in_array($type, ['standard', 'disambiguation'], true) && $type !== '') {
                return null;
            }

            return $data['thumbnail']['source'] ?? null;
        } catch (\Throwable) {
            return null;
        }
    }
}
