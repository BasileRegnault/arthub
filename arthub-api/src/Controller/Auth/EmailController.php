<?php

namespace App\Controller\Auth;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\RateLimiter\RateLimiterFactory;

class EmailController extends AbstractController
{
    public function __construct(
        private RateLimiterFactory $forgotPasswordIpLimiter,
    ) {}

    /**
     * Étape 1 : demande de réinitialisation → envoie un lien avec token.
     */
    #[Route('/api/forgot-password', methods: ['POST'])]
    public function forgotPassword(
        Request $request,
        EntityManagerInterface $em,
        MailerInterface $mailer,
    ): JsonResponse {
        $limiter = $this->forgotPasswordIpLimiter->create($request->getClientIp());
        if (!$limiter->consume(1)->isAccepted()) {
            return $this->json(['message' => 'Trop de demandes, réessayez dans une heure.'], 429);
        }

        $data = $request->toArray();
        $email = $data['email'] ?? null;

        if (!$email) {
            return $this->json(['message' => 'Email requis'], 400);
        }

        $successMessage = 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.';

        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);

        if (!$user) {
            return $this->json(['message' => $successMessage]);
        }

        // Générer un token sécurisé (64 caractères hex)
        $token = bin2hex(random_bytes(32));
        $user->setPasswordResetToken($token);
        $user->setPasswordResetTokenExpiresAt(new \DateTimeImmutable('+1 hour'));
        $em->flush();

        $resetLink = $request->headers->get('Origin', 'https://arthubb.fr')
            . '/auth/reset-password?token=' . $token;

        $message = (new Email())
            ->from('noreply@arthubb.fr')
            ->to($email)
            ->subject('Réinitialisation de votre mot de passe - ArtHub')
            ->html($this->buildResetEmail($resetLink, $user->getUsername()));

        $mailer->send($message);

        return $this->json(['message' => $successMessage]);
    }

    /**
     * Étape 2 : vérification du token et mise à jour du mot de passe.
     */
    #[Route('/api/reset-password', methods: ['POST'])]
    public function resetPassword(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher,
    ): JsonResponse {
        $data = $request->toArray();
        $token = $data['token'] ?? null;
        $newPassword = $data['password'] ?? null;

        if (!$token || !$newPassword) {
            return $this->json(['message' => 'Token et mot de passe requis'], 400);
        }

        if (strlen($newPassword) < 8) {
            return $this->json(['message' => 'Le mot de passe doit contenir au moins 8 caractères'], 400);
        }

        $user = $em->getRepository(User::class)->findOneBy(['passwordResetToken' => $token]);

        if (!$user || !$user->isPasswordResetTokenValid()) {
            return $this->json(['message' => 'Token invalide ou expiré'], 400);
        }

        $user->setPassword($hasher->hashPassword($user, $newPassword));
        $user->setPasswordResetToken(null);
        $user->setPasswordResetTokenExpiresAt(null);
        $em->flush();

        return $this->json(['message' => 'Mot de passe réinitialisé avec succès.']);
    }

    private function buildResetEmail(string $resetLink, string $username): string
    {
        return <<<HTML
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Bonjour {$username},</h2>
            <p>Vous avez demandé la réinitialisation de votre mot de passe sur <strong>ArtHub</strong>.</p>
            <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable <strong>1 heure</strong>.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{$resetLink}"
                   style="background: #1e293b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                    Réinitialiser mon mot de passe
                </a>
            </div>
            <p style="color: #666;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
            <p style="color: #666; word-break: break-all; font-size: 12px;">{$resetLink}</p>
            <p style="color: #999; font-size: 12px;">Si vous n'avez pas fait cette demande, ignorez cet email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">L'équipe ArtHub</p>
        </div>
        HTML;
    }
}
