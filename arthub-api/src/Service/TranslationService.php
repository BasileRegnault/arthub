<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Service de traduction EN → FR via LibreTranslate (auto-hébergé).
 * Aucune limite de quota. Configurer LIBRETRANSLATE_URL dans .env
 * (ex: http://localhost:5000 en local, http://libretranslate:5000 en Docker).
 */
class TranslationService
{
    public function __construct(
        private HttpClientInterface $httpClient,
        private string $libreTranslateUrl = 'http://localhost:5000',
        private string $libreTranslateApiKey = '',
    ) {}

    /**
     * Traduit un texte anglais en français.
     * Retourne le texte original en cas d'erreur.
     */
    public function translateToFrench(string $text): string
    {
        $text = trim(strip_tags($text));
        if (empty($text)) {
            return $text;
        }

        try {
            $body = [
                'q'      => $text,
                'source' => 'en',
                'target' => 'fr',
                'format' => 'text',
            ];

            if (!empty($this->libreTranslateApiKey)) {
                $body['api_key'] = $this->libreTranslateApiKey;
            }

            $response = $this->httpClient->request('POST', $this->libreTranslateUrl . '/translate', [
                'headers' => ['Content-Type' => 'application/json'],
                'json'    => $body,
                'timeout' => 15,
            ]);

            $data = $response->toArray();
            $translated = $data['translatedText'] ?? null;

            if (!empty($translated)) {
                return $translated;
            }

            return $text;
        } catch (\Throwable) {
            return $text;
        }
    }
}
