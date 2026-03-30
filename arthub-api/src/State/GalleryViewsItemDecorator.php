<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Gallery;
use App\Repository\GalleryDailyViewRepository;

final class GalleryViewsItemDecorator implements ProviderInterface
{
    public function __construct(
        private $decorated,
        private GalleryDailyViewRepository $viewsRepo,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): ?object
    {
        if ($operation->getClass() !== Gallery::class) {
            return $this->decorated->provide($operation, $uriVariables, $context);
        }

        $gallery = $this->decorated->provide($operation, $uriVariables, $context);

        if (!$gallery instanceof Gallery || null === $gallery->getId()) {
            return $gallery;
        }

        $counts = $this->viewsRepo->countTotalViewsByGalleryIds([$gallery->getId()]);
        $gallery->setViews($counts[$gallery->getId()] ?? 0);

        return $gallery;
    }
}
