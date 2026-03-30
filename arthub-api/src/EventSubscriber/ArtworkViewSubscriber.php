<?php

namespace App\EventSubscriber;

use ApiPlatform\Symfony\EventListener\EventPriorities;
use App\Entity\Artwork;
use App\Entity\ArtworkDailyView;
use App\Security\IpHasher;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ViewEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class ArtworkViewSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private EntityManagerInterface $em,
        private Security $security,
        private IpHasher $ipHasher,
    ) {}

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::VIEW => ['onKernelView', EventPriorities::POST_WRITE],
        ];
    }

    public function onKernelView(ViewEvent $event): void
    {
        $request = $event->getRequest();

        if ($request->getMethod() !== 'GET') {
            return;
        }

        if (!str_starts_with($request->getPathInfo(), '/api/artworks/')) {
            return;
        }

        $artwork = $event->getControllerResult();
        if (!$artwork instanceof Artwork) {
            return;
        }

        $today = new \DateTimeImmutable('today');
        $user = $this->security->getUser();

        $ipHash = null;
        if (!$user) {
            $ipHash = $this->ipHasher->hash($request->getClientIp());
            if ($ipHash === 'unknown') {
                return;
            }
        }

        $view = new ArtworkDailyView(
            artwork: $artwork,
            viewDate: $today,
            user: $user,
            ipHash: $ipHash
        );

        try {
            $this->em->persist($view);
            $this->em->flush();
        } catch (UniqueConstraintViolationException) {
            return;
        }
    }
}
