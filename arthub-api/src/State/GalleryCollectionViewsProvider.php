<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Gallery;
use App\Repository\GalleryDailyViewRepository;

final class GalleryViewsCollectionDecorator implements ProviderInterface
{
    public function __construct(
        private $decorated,
        private GalleryDailyViewRepository $viewsRepo,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): iterable
    {
        if ($operation->getClass() !== Gallery::class) {
            return $this->decorated->provide($operation, $uriVariables, $context);
        }

        $result = $this->decorated->provide($operation, $uriVariables, $context);

        $galleries = [];
        foreach ($result as $g) {
            if ($g instanceof Gallery && null !== $g->getId()) {
                $galleries[] = $g;
            }
        }

        $ids = array_map(fn (Gallery $g) => $g->getId(), $galleries);
        $counts = $this->viewsRepo->countTotalViewsByGalleryIds($ids);

        foreach ($galleries as $g) {
            $g->setViews($counts[$g->getId()] ?? 0);
        }

        return $result;
    }
}
