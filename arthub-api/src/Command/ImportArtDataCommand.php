<?php

namespace App\Command;

use App\Entity\Artist;
use App\Entity\Artwork;
use App\Enum\ArtworkStyle;
use App\Enum\ArtworkType;
use App\Service\ArtInstituteApiService;
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
        'Painting' => ArtworkType::PAINTING,
        'Sculpture' => ArtworkType::SCULPTURE,
        'Drawing and Watercolor' => ArtworkType::DRAWING,
        'Drawing' => ArtworkType::DRAWING,
        'Photograph' => ArtworkType::PHOTOGRAPHY,
        'Photography' => ArtworkType::PHOTOGRAPHY,
    ];

    // Mots-clés pour mapper les styles
    private const STYLE_KEYWORDS = [
        'Impressionism' => ArtworkStyle::IMPRESSIONISM,
        'Realism' => ArtworkStyle::REALISM,
        'Cubism' => ArtworkStyle::CUBISM,
        'Abstract' => ArtworkStyle::ABSTRACT,
    ];

    public function __construct(
        private ArtInstituteApiService $apiService,
        private EntityManagerInterface $em,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('limit', 'l', InputOption::VALUE_OPTIONAL, 'Nombre d\'œuvres à importer', 50);
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $limit = (int) $input->getOption('limit');

        $io->title('Import de données depuis Art Institute of Chicago');
        $io->info(sprintf('Objectif : %d œuvres', $limit));

        $artistCache = []; // Dédoublonnage par nom complet
        $imported = 0;
        $skipped = 0;
        $page = 1;

        // Types supportés par notre application
        $supportedTypes = array_keys(self::TYPE_MAP);

        // On récupère page par page via l'endpoint de recherche (pré-filtré)
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

                // Filtrer les entrées incomplètes ou avec un type non supporté
                if (!$this->isValidItem($item)) {
                    $skipped++;
                    continue;
                }

                $type = $this->mapType($item['artwork_type_title']);
                if ($type === null) {
                    $skipped++;
                    continue;
                }

                // Récupérer ou créer l'artiste
                $artistName = $item['artist_title'];
                $artist = $this->getOrCreateArtist($artistName, $artistCache);

                // Créer l'œuvre
                $artwork = $this->createArtwork($item, $artist, $type);

                // Stocker l'URL IIIF de l'image si disponible
                if (!empty($item['image_id'])) {
                    $artwork->setImageUrl($this->apiService->getImageUrl($item['image_id']));
                }

                $this->em->persist($artwork);
                $imported++;

                // Flush par batch de 20 pour éviter la surcharge mémoire
                if ($imported % 20 === 0) {
                    $this->em->flush();
                    $io->text(sprintf('  → %d/%d importées...', $imported, $limit));
                }
            }

            $page++;
        }

        // Flush final
        $this->em->flush();

        $io->success(sprintf(
            'Import terminé : %d œuvres importées, %d ignorées, %d artistes créés.',
            $imported,
            $skipped,
            count($artistCache)
        ));

        return Command::SUCCESS;
    }

    /**
     * Vérifie qu'un item de l'API a les champs requis.
     */
    private function isValidItem(array $item): bool
    {
        return !empty($item['title'])
            && !empty($item['artist_title'])
            && !empty($item['artwork_type_title'])
            && !empty($item['description'])
            && strlen(strip_tags($item['description'])) >= 20;
    }

    /**
     * Mappe le type d'œuvre de l'API vers notre enum.
     */
    private function mapType(string $apiType): ?ArtworkType
    {
        return self::TYPE_MAP[$apiType] ?? null;
    }

    /**
     * Mappe le style d'œuvre de l'API vers notre enum.
     */
    private function mapStyle(?string $apiStyle): ArtworkStyle
    {
        if ($apiStyle) {
            foreach (self::STYLE_KEYWORDS as $keyword => $style) {
                if (stripos($apiStyle, $keyword) !== false) {
                    return $style;
                }
            }
        }

        return ArtworkStyle::REALISM; // Fallback
    }

    /**
     * Récupère un artiste existant ou en crée un nouveau.
     */
    private function getOrCreateArtist(string $fullName, array &$cache): Artist
    {
        $key = mb_strtolower(trim($fullName));

        if (isset($cache[$key])) {
            return $cache[$key];
        }

        // Vérifier en base si l'artiste existe déjà
        $parts = $this->parseArtistName($fullName);
        $existing = $this->em->getRepository(Artist::class)->findOneBy([
            'firstname' => $parts['firstname'],
            'lastname' => $parts['lastname'],
        ]);

        if ($existing) {
            $cache[$key] = $existing;
            return $existing;
        }

        // Créer un nouvel artiste
        $artist = new Artist();
        $artist->setFirstname($parts['firstname']);
        $artist->setLastname($parts['lastname']);
        $artist->setBornAt(new \DateTimeImmutable('1800-01-01')); // Date par défaut (l'API artistes a des dates, mais on n'y accède pas ici)
        $artist->setIsConfirmCreate(true);
        $artist->setToBeConfirmed(false);

        $this->em->persist($artist);
        $cache[$key] = $artist;

        return $artist;
    }

    /**
     * Parse un nom d'artiste en prénom + nom.
     * "Claude Monet" → firstname="Claude", lastname="Monet"
     * "Monet" → firstname="", lastname="Monet"
     */
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

    /**
     * Crée une entité Artwork à partir des données de l'API.
     */
    private function createArtwork(array $item, Artist $artist, ArtworkType $type): Artwork
    {
        $artwork = new Artwork();
        $artwork->setTitle($item['title']);
        $artwork->setArtist($artist);
        $artwork->setType($type);
        $artwork->setStyle($this->mapStyle($item['style_title'] ?? null));

        // Description : nettoyer le HTML et s'assurer qu'elle fait au moins 20 caractères
        $description = strip_tags($item['description'] ?? '');
        if (strlen($description) < 20) {
            $description = $description . str_repeat('.', 20 - strlen($description));
        }
        $artwork->setDescription($description);

        // Date de création : parser date_display ou fallback
        $artwork->setCreationDate($this->parseCreationDate($item['date_display'] ?? null));

        // Lieu d'origine
        if (!empty($item['place_of_origin'])) {
            $artwork->setLocation($item['place_of_origin']);
        }

        $artwork->setIsDisplay(true);
        $artwork->setIsConfirmCreate(true);
        $artwork->setToBeConfirmed(false);

        return $artwork;
    }

    /**
     * Parse une date d'affichage de l'API (ex: "1889", "c. 1503", "1880–85").
     */
    private function parseCreationDate(?string $dateDisplay): \DateTimeImmutable
    {
        if ($dateDisplay && preg_match('/(\d{4})/', $dateDisplay, $matches)) {
            $year = (int) $matches[1];
            // S'assurer que la date n'est pas dans le futur
            if ($year <= (int) date('Y') && $year > 0) {
                return new \DateTimeImmutable(sprintf('%04d-01-01', $year));
            }
        }

        return new \DateTimeImmutable('1900-01-01');
    }

}
