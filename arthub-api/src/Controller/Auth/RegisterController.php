<?php 

namespace App\Controller\Auth;

use App\Entity\User;
use App\Entity\UserLoginLog;
use App\Enum\AuthEvent;
use App\Security\IpHasher;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\RateLimiter\RateLimiterFactory;

class RegisterController extends AbstractController
{

    public function __construct(
        private IpHasher $ipHasher,
        private RateLimiterFactory $registerIpLimiter,
    ) {}

    #[Route('/api/register', name: 'api_register', methods: ['POST'])]
    public function register(
        Request $request,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $em
    ): JsonResponse
    {
        $limiter = $this->registerIpLimiter->create($request->getClientIp());
        if (!$limiter->consume(1)->isAccepted()) {
            return new JsonResponse(['error' => 'Trop de tentatives, réessayez dans 15 minutes.'], 429);
        }

        $data = json_decode($request->getContent(), true);

        $email = $data['email'] ?? null;
        $username = $data['username'] ?? null;
        $password = $data['password'] ?? null;

        if (!$email || !$password || !$username) {
            return new JsonResponse(['error' => 'Email, username ou mot de passe manquant'], 400);
        }

        $userRepo = $em->getRepository(User::class);

        // Vérifie doublon avant flush
        if ($userRepo->findOneBy(['email' => $email])) {
            $this->logRegister($em, null, AuthEvent::REGISTER_FAILED, $request, 'Email déjà utilisé');
            return new JsonResponse(['error' => 'Utilisateur déjà existant'], 400);
        }

        if ($userRepo->findOneBy(['username' => $username])) {
            $this->logRegister($em, null, AuthEvent::REGISTER_FAILED, $request, 'Nom d\'utilisateur déjà utilisé');
            return new JsonResponse(['error' => 'Nom d\'utilisateur déjà utilisé'], 400);
        }


        $user = new User();
        $user->setEmail($email);
        $user->setUsername($username);
        $user->setPassword($passwordHasher->hashPassword($user, $password));
        $user->setRoles(['ROLE_USER']);

        try {
            $em->persist($user);
            $em->flush();

            // Log succès
            $this->logRegister($em, $user, AuthEvent::REGISTER_SUCCESS, $request);

            return new JsonResponse(['message' => 'Utilisateur créé avec succès'], 201);

        } catch (\Throwable $e) {
            // Log échec sans crash si EM fermé
            $this->logRegister($em, null, AuthEvent::REGISTER_FAILED, $request, $e->getMessage());

            return new JsonResponse(['error' => 'Erreur lors de l’inscription'], 500);
        }
    }

    private function logRegister(
        EntityManagerInterface $em,
        ?User $user,
        AuthEvent $event,
        Request $request,
        ?string $reason = null
    ): void {
        if (!$em->isOpen()) return;

        try {
            $log = new UserLoginLog();
            $log->setUserConnected($user);
            $log->setEvent($event->value);
            $log->setIpHash($this->ipHasher->hash($request->getClientIp()));
            $log->setUserAgent($request->headers->get('User-Agent'));
            $log->setMessage($reason);

            $em->persist($log);
            $em->flush();
        } catch (\Throwable $e) {
            // Pas d'action si le log échoue
        }
    }
}
