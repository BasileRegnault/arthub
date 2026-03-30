<?php

// Souscripteur d'événements pour le suivi des vues de galeries
namespace App\EventSubscriber;

use ApiPlatform\Symfony\EventListener\EventPriorities;
use App\Entity\Gallery;
use App\Entity\GalleryDailyView;
use App\Security\IpHasher;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ViewEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class GalleryViewSubscriber implements EventSubscriberInterface
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

        if (!str_starts_with($request->getPathInfo(), '/api/galleries/')) {
            return;
        }

        $gallery = $event->getControllerResult();
        if (!$gallery instanceof Gallery) {
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

        $view = new GalleryDailyView(
            gallery: $gallery,
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
