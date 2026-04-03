<?php

namespace App\Command;

use App\Entity\Gallery;
use App\Entity\User;
use App\Entity\Artwork;
use App\Enum\ArtworkStyle;
use App\Enum\ArtworkType;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:create-public-galleries',
    description: 'Crée des galeries publiques thématiques à partir des œuvres importées',
)]
class CreatePublicGalleriesCommand extends Command
{
    // Galeries thématiques : nom, description, critères de filtrage
    private const GALLERIES = [
        [
            'name'        => 'Chefs-d\'œuvre de l\'Impressionnisme',
            'description' => 'Une sélection des plus belles œuvres impressionnistes de notre collection.',
            'style'       => ArtworkStyle::IMPRESSIONISM,
            'type'        => null,
            'limit'       => 12,
        ],
        [
            'name'        => 'Réalisme & Classicisme',
            'description' => 'Des œuvres figuratives qui capturent le monde tel qu\'il est, avec précision et sincérité.',
            'style'       => ArtworkStyle::REALISM,
            'type'        => null,
            'limit'       => 12,
        ],
        [
            'name'        => 'L\'Art Abstrait',
            'description' => 'Formes, couleurs et émotions : plongez dans l\'univers de l\'abstraction.',
            'style'       => ArtworkStyle::ABSTRACT,
            'type'        => null,
            'limit'       => 10,
        ],
        [
            'name'        => 'Le Cubisme',
            'description' => 'Géométrie et perspectives multiples : les œuvres cubistes de notre base.',
            'style'       => ArtworkStyle::CUBISM,
            'type'        => null,
            'limit'       => 10,
        ],
        [
            'name'        => 'Sculptures & Arts Plastiques',
            'description' => 'La beauté de la matière façonnée par les mains des artistes.',
            'style'       => null,
            'type'        => ArtworkType::SCULPTURE,
            'limit'       => 10,
        ],
        [
            'name'        => 'Photographie Artistique',
            'description' => 'L\'œil du photographe comme miroir du monde.',
            'style'       => null,
            'type'        => ArtworkType::PHOTOGRAPHY,
            'limit'       => 10,
        ],
        [
            'name'        => 'Dessins & Aquarelles',
            'description' => 'La délicatesse du trait et de la couleur dans l\'art du dessin.',
            'style'       => null,
            'type'        => ArtworkType::DRAWING,
            'limit'       => 10,
        ],
        [
            'name'        => 'Peintures Incontournables',
            'description' => 'Une sélection variée des plus grandes peintures de notre collection.',
            'style'       => null,
            'type'        => ArtworkType::PAINTING,
            'limit'       => 15,
        ],
    ];

    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Création des galeries publiques thématiques');

        // Récupérer l'admin pour être propriétaire des galeries
        $admin = $this->em->getRepository(User::class)->findOneBy(['username' => 'admin'])
            ?? $this->em->getRepository(User::class)->findOneBy([]);

        if (!$admin) {
            $io->error('Aucun utilisateur trouvé en base. Lancez d\'abord les fixtures.');
            return Command::FAILURE;
        }

        $created = 0;
        $skipped = 0;

        foreach (self::GALLERIES as $config) {
            // Éviter les doublons si la commande est relancée
            $existing = $this->em->getRepository(Gallery::class)->findOneBy(['name' => $config['name']]);
            if ($existing) {
                $io->text(sprintf('  → Galerie "%s" déjà existante, ignorée.', $config['name']));
                $skipped++;
                continue;
            }

            $artworks = $this->findArtworks($config['style'], $config['type'], $config['limit']);

            if (count($artworks) === 0) {
                $io->warning(sprintf('Aucune œuvre trouvée pour "%s", galerie ignorée.', $config['name']));
                $skipped++;
                continue;
            }

            $gallery = new Gallery();
            $gallery->setName($config['name']);
            $gallery->setDescription($config['description']);
            $gallery->setIsPublic(true);
            $gallery->setCreatedBy($admin);
            $gallery->setUpdatedBy($admin);
            $gallery->setCreatedAt(new \DateTimeImmutable());

            foreach ($artworks as $artwork) {
                $gallery->addArtwork($artwork);
            }

            $this->em->persist($gallery);
            $created++;

            $io->text(sprintf('  ✓ "%s" — %d œuvres', $config['name'], count($artworks)));
        }

        $this->em->flush();

        $io->success(sprintf('%d galerie(s) créée(s), %d ignorée(s).', $created, $skipped));

        return Command::SUCCESS;
    }

    /**
     * @return Artwork[]
     */
    private function findArtworks(?ArtworkStyle $style, ?ArtworkType $type, int $limit): array
    {
        $qb = $this->em->getRepository(Artwork::class)->createQueryBuilder('a')
            ->where('a.isConfirmCreate = true')
            ->andWhere('a.isDisplay = true');

        if ($style !== null) {
            $qb->andWhere('a.style = :style')->setParameter('style', $style);
        }

        if ($type !== null) {
            $qb->andWhere('a.type = :type')->setParameter('type', $type);
        }

        $all = $qb->getQuery()->getResult();
        shuffle($all);

        return array_slice($all, 0, $limit);
    }
}
