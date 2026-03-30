<?php

namespace App\EventListener;

use App\Entity\UserLoginLog;
use App\Enum\AuthEvent;
use App\Security\IpHasher;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Event\AuthenticationFailureEvent;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\RateLimiter\RateLimiterFactory;

class JWTLoginFailureListener
{
    public function __construct(
        private EntityManagerInterface $em,
        private RequestStack $requestStack,
        private IpHasher $ipHasher,
        private RateLimiterFactory $loginIpLimiter,
        private RateLimiterFactory $loginIpUsernameLimiter
    ) {}

    public function __invoke(AuthenticationFailureEvent $event): void
    {
        $request = $this->requestStack->getCurrentRequest();

        $ipHash = $this->ipHasher->hash($request?->getClientIp());
        if ($ipHash === 'unknown') {
            $ipHash = 'unknown';
        }

        $payload = $request?->toArray() ?? [];
        $username = (string) ($payload['username'] ?? $payload['email'] ?? 'unknown');
        $username = mb_strtolower(trim($username));

        $ipKey = $ipHash;
        $ipUserKey = $ipHash . '|' . hash('sha256', $username);

        $limitIp = $this->loginIpLimiter->create($ipKey)->consume(1);
        $limitIpUser = $this->loginIpUsernameLimiter->create($ipUserKey)->consume(1);

        if (!$limitIp->isAccepted() || !$limitIpUser->isAccepted()) {
            $retryAt = null;

            $ra1 = $limitIp->getRetryAfter();
            $ra2 = $limitIpUser->getRetryAfter();

            if ($ra1 && $ra2) {
                $retryAt = max($ra1->getTimestamp(), $ra2->getTimestamp());
            } elseif ($ra1) {
                $retryAt = $ra1->getTimestamp();
            } elseif ($ra2) {
                $retryAt = $ra2->getTimestamp();
            }

            $headers = [];
            if ($retryAt) {
                $headers['Retry-After'] = (string) max(0, $retryAt - time());
            }

            $event->setResponse(new JsonResponse([
                'error' => 'Too many login attempts. Please try again later.'
            ], 429, $headers));

            return;
        }

        $log = new UserLoginLog();
        $log->setUserConnected(null);
        $log->setEvent(AuthEvent::LOGIN_FAILED->value);
        $log->setIpHash($ipHash);
        $log->setUserAgent($request?->headers->get('User-Agent'));

        $this->em->persist($log);
        $this->em->flush();
    }
}
