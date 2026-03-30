<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Artwork;
use App\Repository\ArtworkDailyViewRepository;

final class ArtworkViewsCollectionDecorator implements ProviderInterface
{
    public function __construct(
        private $decorated, // pas typé
        private ArtworkDailyViewRepository $viewsRepo,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): iterable
    {
        if ($operation->getClass() !== Artwork::class) {
            return $this->decorated->provide($operation, $uriVariables, $context);
        }

        $result = $this->decorated->provide($operation, $uriVariables, $context);

        $artworks = [];
        foreach ($result as $a) {
            if ($a instanceof Artwork && null !== $a->getId()) {
                $artworks[] = $a;
            }
        }

        $ids = array_map(fn (Artwork $a) => $a->getId(), $artworks);
        $counts = $this->viewsRepo->countTotalViewsByArtworkIds($ids);

        foreach ($artworks as $a) {
            $a->setViews($counts[$a->getId()] ?? 0);
        }

        return $result;
    }
}
