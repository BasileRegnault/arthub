<?php

namespace App\EventListener;

use App\Entity\UserLoginLog;
use App\Enum\AuthEvent;
use App\Security\IpHasher;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Event\AuthenticationSuccessEvent;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\RateLimiter\RateLimiterFactory;

class JWTLoginSuccessListener
{
    public function __construct(
        private EntityManagerInterface $em,
        private RequestStack $requestStack,
        private IpHasher $ipHasher,
        private RateLimiterFactory $loginIpLimiter,
        private RateLimiterFactory $loginIpUsernameLimiter
    ) {}

    public function __invoke(AuthenticationSuccessEvent $event): void
    {
        $request = $this->requestStack->getCurrentRequest();
        $user = $event->getUser();

        $ipHash = $this->ipHasher->hash($request?->getClientIp());
        if ($ipHash !== 'unknown') {
            $this->loginIpLimiter->create($ipHash)->reset();
        }

        $payload = $request?->toArray() ?? [];
        $username = (string) ($payload['username'] ?? $payload['email'] ?? '');
        $username = mb_strtolower(trim($username));

        if ($ipHash !== 'unknown' && $username !== '') {
            $ipUserKey = $ipHash . '|' . hash('sha256', $username);
            $this->loginIpUsernameLimiter->create($ipUserKey)->reset();
        }

        $log = new UserLoginLog();
        $log->setUserConnected($user);
        $log->setEvent(AuthEvent::LOGIN_SUCCESS->value);
        $log->setIpHash($ipHash);
        $log->setUserAgent($request?->headers->get('User-Agent'));

        $this->em->persist($log);
        $this->em->flush();
    }
}
