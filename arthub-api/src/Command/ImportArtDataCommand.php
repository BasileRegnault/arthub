<?php

namespace App\Command;

use App\Entity\Artist;
use App\Entity\Artwork;
use App\Enum\ArtworkStyle;
use App\Enum\ArtworkType;
use App\Service\ArtInstituteApiService;
use App\Service\CountryTranslatorService;
use App\Service\TranslationService;
use App\Service\WikipediaApiService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:import-art-data',
    description: 'Importe des œuvres et artistes réels depuis l\'API Art Institute of Chicago',
)]
class ImportArtDataCommand extends Command
{
    // Mapping type API → enum ArtworkType
    private const TYPE_MAP = [
        'Painting'                  => ArtworkType::PAINTING,
        'Sculpture'                 => ArtworkType::SCULPTURE,
        'Drawing and Watercolor'    => ArtworkType::WATERCOLOR,
        'Drawing'                   => ArtworkType::DRAWING,
        'Photograph'                => ArtworkType::PHOTOGRAPHY,
        'Photography'               => ArtworkType::PHOTOGRAPHY,
        'Print'                     => ArtworkType::PRINT,
        'Textile'                   => ArtworkType::TEXTILE,
        'Textile (Religious)'       => ArtworkType::TEXTILE,
        'Decorative Arts'           => ArtworkType::DECORATIVE_ARTS,
        'Decorative Art'            => ArtworkType::DECORATIVE_ARTS,
        'Ceramics'                  => ArtworkType::CERAMICS,
        'Vessel'                    => ArtworkType::CERAMICS,
        'Metalwork'                 => ArtworkType::METALWORK,
        'Glass'                     => ArtworkType::GLASS,
        'Jewelry'                   => ArtworkType::JEWELRY,
        'Furniture'                 => ArtworkType::FURNITURE,
        'Installation'              => ArtworkType::INSTALLATION,
        'Video'                     => ArtworkType::VIDEO,
        'Film'                      => ArtworkType::VIDEO,
        'Book'                      => ArtworkType::BOOK,
        'Manuscript'                => ArtworkType::BOOK,
        'Architectural Fragment'    => ArtworkType::ARCHITECTURE,
        'Mixed Media'               => ArtworkType::MIXED_MEDIA,
        'Collage'                   => ArtworkType::COLLAGE,
        'Pastel'                    => ArtworkType::PASTEL,
    ];

    // Mots-clés pour mapper les styles (ordre important : du plus spécifique au plus général)
    private const STYLE_KEYWORDS = [
        'Post-Impressionism'        => ArtworkStyle::POST_IMPRESSIONISM,
        'Post Impressionism'        => ArtworkStyle::POST_IMPRESSIONISM,
        'Impressionism'             => ArtworkStyle::IMPRESSIONISM,
        'Abstract Expressionism'    => ArtworkStyle::ABSTRACT_EXPRESSIONISM,
        'Abstract'                  => ArtworkStyle::ABSTRACT,
        'Expressionism'             => ArtworkStyle::EXPRESSIONISM,
        'Surrealism'                => ArtworkStyle::SURREALISM,
        'Fauvism'                   => ArtworkStyle::FAUVISM,
        'Cubism'                    => ArtworkStyle::CUBISM,
        'Pop Art'                   => ArtworkStyle::POP_ART,
        'Minimalism'                => ArtworkStyle::MINIMALISM,
        'Minimalist'                => ArtworkStyle::MINIMALISM,
        'Baroque'                   => ArtworkStyle::BAROQUE,
        'Renaissance'               => ArtworkStyle::RENAISSANCE,
        'Romanticism'               => ArtworkStyle::ROMANTICISM,
        'Romantic'                  => ArtworkStyle::ROMANTICISM,
        'Neoclassicism'             => ArtworkStyle::NEOCLASSICISM,
        'Neoclassical'              => ArtworkStyle::NEOCLASSICISM,
        'Art Nouveau'               => ArtworkStyle::ART_NOUVEAU,
        'Art Deco'                  => ArtworkStyle::ART_DECO,
        'Symbolism'                 => ArtworkStyle::SYMBOLISM,
        'Symbolist'                 => ArtworkStyle::SYMBOLISM,
        'Modernism'                 => ArtworkStyle::MODERNISM,
        'Modern'                    => ArtworkStyle::MODERNISM,
        'Contemporary'              => ArtworkStyle::CONTEMPORARY,
        'Gothic'                    => ArtworkStyle::GOTHIC,
        'Mannerism'                 => ArtworkStyle::MANNERISM,
        'Rococo'                    => ArtworkStyle::ROCOCO,
        'Pointillism'               => ArtworkStyle::POINTILLISM,
        'Naturalism'                => ArtworkStyle::NATURALISM,
        'Realism'                   => ArtworkStyle::REALISM,
    ];


    public function __construct(
        private ArtInstituteApiService $apiService,
        private WikipediaApiService $wikipediaService,
        private TranslationService $translationService,
        private CountryTranslatorService $countryTranslator,
        private EntityManagerInterface $em,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('limit', 'l', InputOption::VALUE_OPTIONAL, 'Nombre d\'œuvres à importer', 50)
            ->addOption('translate', 't', InputOption::VALUE_NONE, 'Traduire les descriptions EN → FR (plus lent, quota journalier)');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $limit = (int) $input->getOption('limit');
        $shouldTranslate = (bool) $input->getOption('translate');

        $io->title('Import de données depuis Art Institute of Chicago');
        $io->info(sprintf('Objectif : %d œuvres | Traduction : %s', $limit, $shouldTranslate ? 'activée' : 'désactivée'));

        $artistCache = []; // Dédoublonnage par nom complet
        $imported = 0;
        $skipped = 0;
        $page = 1;

        $supportedTypes = array_keys(self::TYPE_MAP);

        while ($imported < $limit) {
            $batchSize = min(100, $limit - $imported);
            $io->section(sprintf('Récupération page %d (batch de %d)...', $page, $batchSize));

            try {
                $response = $this->apiService->searchArtworks($batchSize, $page, $supportedTypes);
            } catch (\Throwable $e) {
                $io->error('Erreur API : ' . $e->getMessage());
                return Command::FAILURE;
            }

            $artworks = $response['data'] ?? [];

            if (empty($artworks)) {
                $io->warning('Plus de données disponibles.');
                break;
            }

            foreach ($artworks as $item) {
                if ($imported >= $limit) {
                    break;
                }

                if (!$this->isValidItem($item)) {
                    $skipped++;
                    continue;
                }

                $type = $this->mapType($item['artwork_type_title']);
                if ($type === null) {
                    $skipped++;
                    continue;
                }

                // Récupérer ou créer l'artiste (enrichi avec données Art Institute + Wikipedia)
                $artistName = $item['artist_title'];
                $artistId = isset($item['artist_id']) ? (int) $item['artist_id'] : null;
                $artist = $this->getOrCreateArtist($artistName, $artistId, $artistCache, $shouldTranslate, $io);

                // Ignorer si l'œuvre existe déjà (titre + artiste)
                $alreadyExists = $this->em->getRepository(Artwork::class)->findOneBy([
                    'title'  => $item['title'],
                    'artist' => $artist,
                ]);
                if ($alreadyExists) {
                    $skipped++;
                    continue;
                }

                $artwork = $this->createArtwork($item, $artist, $type, $shouldTranslate);

                if (!empty($item['image_id'])) {
                    $artwork->setImageUrl($this->apiService->getImageUrl($item['image_id']));
                }

                $this->em->persist($artwork);
                $imported++;

                if ($imported % 20 === 0) {
                    $this->em->flush();
                    $io->text(sprintf('  → %d/%d importées...', $imported, $limit));
                }
            }

            $page++;
        }

        $this->em->flush();

        $io->success(sprintf(
            'Import terminé : %d œuvres importées, %d ignorées, %d artistes créés.',
            $imported,
            $skipped,
            count($artistCache)
        ));

        return Command::SUCCESS;
    }

    private function isValidItem(array $item): bool
    {
        return !empty($item['title'])
            && !empty($item['artist_title'])
            && !empty($item['artwork_type_title'])
            && !empty($item['description'])
            && strlen(strip_tags($item['description'])) >= 20;
    }

    private function mapType(string $apiType): ?ArtworkType
    {
        return self::TYPE_MAP[$apiType] ?? null;
    }

    private function mapStyle(?string $apiStyle): ArtworkStyle
    {
        if ($apiStyle) {
            foreach (self::STYLE_KEYWORDS as $keyword => $style) {
                if (stripos($apiStyle, $keyword) !== false) {
                    return $style;
                }
            }
        }

        return ArtworkStyle::REALISM;
    }

    /**
     * Récupère un artiste existant ou en crée un nouveau,
     * enrichi des données Art Institute (/agents/{id}) et du portrait Wikipedia.
     */
    private function getOrCreateArtist(
        string $fullName,
        ?int $artistId,
        array &$cache,
        bool $shouldTranslate,
        SymfonyStyle $io,
    ): Artist {
        $key = mb_strtolower(trim($fullName));

        if (isset($cache[$key])) {
            return $cache[$key];
        }

        // Vérifier en base
        $parts = $this->parseArtistName($fullName);
        $existing = $this->em->getRepository(Artist::class)->findOneBy([
            'firstname' => $parts['firstname'],
            'lastname' => $parts['lastname'],
        ]);

        if ($existing) {
            $cache[$key] = $existing;
            return $existing;
        }

        // Créer le nouvel artiste
        $artist = new Artist();
        $artist->setFirstname($parts['firstname']);
        $artist->setLastname($parts['lastname']);
        $artist->setIsConfirmCreate(true);
        $artist->setToBeConfirmed(false);

        // Enrichir avec les données Art Institute si on a l'ID
        $agentData = $artistId ? $this->apiService->fetchAgent($artistId) : [];

        // Dates de naissance / décès
        $bornYear = isset($agentData['birth_date']) && $agentData['birth_date'] > 0
            ? (int) $agentData['birth_date']
            : null;
        $diedYear = isset($agentData['death_date']) && $agentData['death_date'] > 0
            ? (int) $agentData['death_date']
            : null;

        $artist->setBornAt(
            $bornYear ? new \DateTimeImmutable(sprintf('%04d-01-01', $bornYear)) : new \DateTimeImmutable('1800-01-01')
        );
        if ($diedYear) {
            $artist->setDiedAt(new \DateTimeImmutable(sprintf('%04d-01-01', $diedYear)));
        }

        // Nationalité (via birth_place → traduction vers nom de pays FR)
        if (!empty($agentData['birth_place'])) {
            $nationality = $this->countryTranslator->translate($agentData['birth_place']);
            $artist->setNationality($nationality);
        }

        // Biographie
        $bio = strip_tags($agentData['description'] ?? '');
        if (!empty($bio)) {
            if ($shouldTranslate) {
                $bio = $this->translationService->translateToFrench($bio);
                usleep(300_000); // 300ms pour éviter le rate limit
            }
            $artist->setBiography($bio);
        }

        // Portrait Wikipedia
        $thumbnail = $this->wikipediaService->getArtistThumbnail($fullName);
        if ($thumbnail) {
            $artist->setImageUrl($thumbnail);
            $io->text(sprintf('    Portrait Wikipedia trouvé pour %s', $fullName));
        }

        $this->em->persist($artist);
        $cache[$key] = $artist;

        return $artist;
    }

    private function parseArtistName(string $fullName): array
    {
        $parts = explode(' ', trim($fullName));

        if (count($parts) === 1) {
            return ['firstname' => '', 'lastname' => $parts[0]];
        }

        $lastname = array_pop($parts);
        $firstname = implode(' ', $parts);

        return ['firstname' => $firstname, 'lastname' => $lastname];
    }

    private function createArtwork(array $item, Artist $artist, ArtworkType $type, bool $shouldTranslate): Artwork
    {
        $artwork = new Artwork();
        $artwork->setTitle($item['title']);
        $artwork->setArtist($artist);
        $artwork->setType($type);
        $artwork->setStyle($this->mapStyle($item['style_title'] ?? null));

        $description = strip_tags($item['description'] ?? '');
        if (strlen($description) < 20) {
            $description = $description . str_repeat('.', 20 - strlen($description));
        }

        if ($shouldTranslate && strlen($description) >= 20) {
            $description = $this->translationService->translateToFrench($description);
            usleep(300_000); // 300ms entre chaque appel traduction
        }

        $artwork->setDescription($description);
        $artwork->setCreationDate($this->parseCreationDate($item['date_display'] ?? null));

        // Traduire le lieu d'origine EN → FR (cohérence avec le frontend)
        if (!empty($item['place_of_origin'])) {
            $artwork->setLocation($this->countryTranslator->translate($item['place_of_origin']));
        }

        $artwork->setIsDisplay(true);
        $artwork->setIsConfirmCreate(true);
        $artwork->setToBeConfirmed(false);

        return $artwork;
    }

    private function parseCreationDate(?string $dateDisplay): \DateTimeImmutable
    {
        if ($dateDisplay && preg_match('/(\d{4})/', $dateDisplay, $matches)) {
            $year = (int) $matches[1];
            if ($year <= (int) date('Y') && $year > 0) {
                return new \DateTimeImmutable(sprintf('%04d-01-01', $year));
            }
        }

        return new \DateTimeImmutable('1900-01-01');
    }
}
