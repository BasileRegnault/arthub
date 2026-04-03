<?php

namespace App\Service;

/**
 * Traduit les noms de pays/lieux anglais vers les noms français officiels
 * utilisés par restcountries.com (translations.fra.common).
 * Couvre les noms retournés par l'API Art Institute of Chicago.
 */
class CountryTranslatorService
{
    /**
     * Correspondances pays EN → FR (noms restcountries.com)
     */
    private const COUNTRY_MAP = [
        // Amériques
        'united states'           => 'États-Unis',
        'united states of america' => 'États-Unis',
        'usa'                     => 'États-Unis',
        'u.s.a.'                  => 'États-Unis',
        'america'                 => 'États-Unis',
        'canada'                  => 'Canada',
        'mexico'                  => 'Mexique',
        'brazil'                  => 'Brésil',
        'brasil'                  => 'Brésil',
        'argentina'               => 'Argentine',
        'colombia'                => 'Colombie',
        'chile'                   => 'Chili',
        'peru'                    => 'Pérou',
        'bolivia'                 => 'Bolivie',
        'ecuador'                 => 'Équateur',
        'venezuela'               => 'Venezuela',
        'cuba'                    => 'Cuba',
        'haiti'                   => 'Haïti',

        // Europe occidentale
        'france'                  => 'France',
        'italy'                   => 'Italie',
        'españa'                  => 'Espagne',
        'spain'                   => 'Espagne',
        'germany'                 => 'Allemagne',
        'netherlands'             => 'Pays-Bas',
        'holland'                 => 'Pays-Bas',
        'belgium'                 => 'Belgique',
        'switzerland'             => 'Suisse',
        'austria'                 => 'Autriche',
        'portugal'                => 'Portugal',
        'luxembourg'              => 'Luxembourg',
        'monaco'                  => 'Monaco',

        // Îles britanniques
        'united kingdom'          => 'Royaume-Uni',
        'great britain'           => 'Royaume-Uni',
        'britain'                 => 'Royaume-Uni',
        'england'                 => 'Royaume-Uni',
        'scotland'                => 'Royaume-Uni',
        'wales'                   => 'Royaume-Uni',
        'ireland'                 => 'Irlande',

        // Europe du nord
        'sweden'                  => 'Suède',
        'norway'                  => 'Norvège',
        'denmark'                 => 'Danemark',
        'finland'                 => 'Finlande',
        'iceland'                 => 'Islande',

        // Europe de l'est
        'russia'                  => 'Russie',
        'russian federation'      => 'Russie',
        'ukraine'                 => 'Ukraine',
        'poland'                  => 'Pologne',
        'czech republic'          => 'Tchéquie',
        'czechoslovakia'          => 'Tchéquie',
        'bohemia'                 => 'Tchéquie',
        'moravia'                 => 'Tchéquie',
        'hungary'                 => 'Hongrie',
        'romania'                 => 'Roumanie',
        'bulgaria'                => 'Bulgarie',
        'serbia'                  => 'Serbie',
        'croatia'                 => 'Croatie',
        'slovenia'                => 'Slovénie',
        'slovakia'                => 'Slovaquie',
        'yugoslavia'              => 'Serbie',
        'estonia'                 => 'Estonie',
        'latvia'                  => 'Lettonie',
        'lithuania'               => 'Lituanie',
        'belarus'                 => 'Biélorussie',
        'moldova'                 => 'Moldavie',

        // Europe du sud
        'greece'                  => 'Grèce',
        'ancient greece'          => 'Grèce',
        'turkey'                  => 'Turquie',
        'albania'                 => 'Albanie',
        'north macedonia'         => 'Macédoine du Nord',
        'cyprus'                  => 'Chypre',
        'malta'                   => 'Malte',

        // Moyen-Orient / Asie occidentale
        'iran'                    => 'Iran',
        'persia'                  => 'Iran',
        'iraq'                    => 'Irak',
        'mesopotamia'             => 'Irak',
        'syria'                   => 'Syrie',
        'lebanon'                 => 'Liban',
        'israel'                  => 'Israël',
        'palestine'               => 'Palestine',
        'jordan'                  => 'Jordanie',
        'saudi arabia'            => 'Arabie saoudite',
        'egypt'                   => 'Égypte',
        'ottoman empire'          => 'Turquie',
        'byzantium'               => 'Turquie',
        'byzantine empire'        => 'Turquie',

        // Asie
        'china'                   => 'Chine',
        'japan'                   => 'Japon',
        'india'                   => 'Inde',
        'south korea'             => 'Corée du Sud',
        'korea'                   => 'Corée du Sud',
        'north korea'             => 'Corée du Nord',
        'vietnam'                 => 'Viêt Nam',
        'thailand'                => 'Thaïlande',
        'cambodia'                => 'Cambodge',
        'indonesia'               => 'Indonésie',
        'philippines'             => 'Philippines',
        'malaysia'                => 'Malaisie',
        'myanmar'                 => 'Myanmar',
        'burma'                   => 'Myanmar',
        'afghanistan'             => 'Afghanistan',
        'pakistan'                => 'Pakistan',
        'bangladesh'              => 'Bangladesh',
        'sri lanka'               => 'Sri Lanka',
        'nepal'                   => 'Népal',
        'mongolia'                => 'Mongolie',
        'tibet'                   => 'Chine',
        'taiwan'                  => 'Taïwan',

        // Afrique
        'morocco'                 => 'Maroc',
        'algeria'                 => 'Algérie',
        'tunisia'                 => 'Tunisie',
        'libya'                   => 'Libye',
        'ethiopia'                => 'Éthiopie',
        'nigeria'                 => 'Nigéria',
        'south africa'            => 'Afrique du Sud',
        'kenya'                   => 'Kenya',
        'ghana'                   => 'Ghana',
        'senegal'                 => 'Sénégal',
        'congo'                   => 'Congo',
        'cameroon'                => 'Cameroun',
        'mali'                    => 'Mali',

        // Océanie
        'australia'               => 'Australie',
        'new zealand'             => 'Nouvelle-Zélande',

        // Régions historiques françaises / régions
        'flanders'                => 'Belgique',
        'burgundy'                => 'France',
        'brittany'                => 'France',
        'alsace'                  => 'France',
        'normandy'                => 'France',
        'provence'                => 'France',
        'gascony'                 => 'France',
        'lorraine'                => 'France',

        // Régions historiques allemandes
        'saxony'                  => 'Allemagne',
        'bavaria'                 => 'Allemagne',
        'prussia'                 => 'Allemagne',
        'rhineland'               => 'Allemagne',
        'westphalia'              => 'Allemagne',
        'württemberg'             => 'Allemagne',

        // Régions historiques espagnoles / italiennes
        'castile'                 => 'Espagne',
        'catalonia'               => 'Espagne',
        'aragon'                  => 'Espagne',
        'andalusia'               => 'Espagne',
        'lombardy'                => 'Italie',
        'tuscany'                 => 'Italie',
        'sicily'                  => 'Italie',
        'venice'                  => 'Italie',
        'naples'                  => 'Italie',
        'papal states'            => 'Italie',
    ];

    /**
     * Correspondances villes principales → pays FR
     */
    private const CITY_MAP = [
        // France
        'paris'           => 'France',
        'lyon'            => 'France',
        'marseille'       => 'France',
        'bordeaux'        => 'France',
        'strasbourg'      => 'France',

        // Italie
        'rome'            => 'Italie',
        'florence'        => 'Italie',
        'firenze'         => 'Italie',
        'venice'          => 'Italie',
        'venezia'         => 'Italie',
        'milan'           => 'Italie',
        'naples'          => 'Italie',
        'napoli'          => 'Italie',
        'bologna'         => 'Italie',
        'siena'           => 'Italie',
        'genoa'           => 'Italie',
        'turin'           => 'Italie',

        // Royaume-Uni
        'london'          => 'Royaume-Uni',
        'edinburgh'       => 'Royaume-Uni',
        'glasgow'         => 'Royaume-Uni',
        'dublin'          => 'Irlande',

        // Pays-Bas / Belgique
        'amsterdam'       => 'Pays-Bas',
        'haarlem'         => 'Pays-Bas',
        'antwerp'         => 'Belgique',
        'brussels'        => 'Belgique',
        'bruges'          => 'Belgique',
        'ghent'           => 'Belgique',

        // Allemagne
        'berlin'          => 'Allemagne',
        'munich'          => 'Allemagne',
        'cologne'         => 'Allemagne',
        'hamburg'         => 'Allemagne',
        'frankfurt'       => 'Allemagne',
        'nuremberg'       => 'Allemagne',
        'augsburg'        => 'Allemagne',
        'düsseldorf'      => 'Allemagne',
        'dresden'         => 'Allemagne',

        // Autriche
        'vienna'          => 'Autriche',
        'wien'            => 'Autriche',
        'salzburg'        => 'Autriche',

        // Espagne
        'madrid'          => 'Espagne',
        'barcelona'       => 'Espagne',
        'seville'         => 'Espagne',
        'toledo'          => 'Espagne',
        'granada'         => 'Espagne',

        // Suisse
        'zurich'          => 'Suisse',
        'geneva'          => 'Suisse',
        'bern'            => 'Suisse',
        'basel'           => 'Suisse',

        // Pays de l'Est
        'prague'          => 'Tchéquie',
        'warsaw'          => 'Pologne',
        'krakow'          => 'Pologne',
        'budapest'        => 'Hongrie',
        'bucharest'       => 'Roumanie',
        'sofia'           => 'Bulgarie',
        'athens'          => 'Grèce',
        'moscow'          => 'Russie',
        'st. petersburg'  => 'Russie',
        'saint petersburg' => 'Russie',
        'kiev'            => 'Ukraine',

        // Moyen-Orient
        'istanbul'        => 'Turquie',
        'constantinople'  => 'Turquie',
        'cairo'           => 'Égypte',
        'baghdad'         => 'Irak',
        'tehran'          => 'Iran',
        'damascus'        => 'Syrie',
        'jerusalem'       => 'Israël',

        // Asie
        'beijing'         => 'Chine',
        'peking'          => 'Chine',
        'shanghai'        => 'Chine',
        'tokyo'           => 'Japon',
        'kyoto'           => 'Japon',
        'osaka'           => 'Japon',
        'delhi'           => 'Inde',
        'mumbai'          => 'Inde',
        'bombay'          => 'Inde',
        'seoul'           => 'Corée du Sud',

        // États-Unis (villes avec état)
        'new york'        => 'États-Unis',
        'chicago'         => 'États-Unis',
        'boston'          => 'États-Unis',
        'philadelphia'    => 'États-Unis',
        'washington'      => 'États-Unis',
        'san francisco'   => 'États-Unis',
        'los angeles'     => 'États-Unis',

        // Mexique
        'mexico city'     => 'Mexique',
    ];

    /**
     * Traduit un nom de lieu anglais (pays ou ville) vers le nom de pays français.
     * Retourne null si vide, retourne l'original si aucune correspondance.
     */
    public function translate(?string $location): ?string
    {
        if (empty($location)) {
            return null;
        }

        // Nettoyer : supprimer les mentions d'état US ("Chicago, IL" → "Chicago")
        $cleaned = preg_replace('/,\s*[A-Z]{2}$/', '', trim($location));
        $lower = mb_strtolower(trim($cleaned));

        // 1. Correspondance exacte pays
        if (isset(self::COUNTRY_MAP[$lower])) {
            return self::COUNTRY_MAP[$lower];
        }

        // 2. Correspondance exacte ville
        if (isset(self::CITY_MAP[$lower])) {
            return self::CITY_MAP[$lower];
        }

        // 3. Correspondance partielle pays (ex: "Ancient United States" improbable, mais couvre les variantes)
        foreach (self::COUNTRY_MAP as $en => $fr) {
            if (str_contains($lower, $en)) {
                return $fr;
            }
        }

        // 4. Correspondance partielle ville (ex: "St. Petersburg, Russia")
        foreach (self::CITY_MAP as $city => $fr) {
            if (str_contains($lower, $city)) {
                return $fr;
            }
        }

        // Aucune correspondance : retourner tel quel
        return $location;
    }
}
