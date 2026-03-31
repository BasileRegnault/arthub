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

class EmailController extends AbstractController
{
    /**
     * Réinitialisation du mot de passe.
     * Génère un nouveau mot de passe aléatoire et l'envoie par email à l'utilisateur.
     */
    #[Route('/api/forgot-password', methods: ['POST'])]
    public function forgotPassword(
        Request $request,
        EntityManagerInterface $em,
        MailerInterface $mailer,
        UserPasswordHasherInterface $hasher
    ): JsonResponse {
        $data = $request->toArray();
        $email = $data['email'] ?? null;

        if (!$email) {
            return $this->json(['message' => 'Email requis'], 400);
        }

        // Recherche de l'utilisateur par email
        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);

        // Réponse identique dans tous les cas pour ne pas révéler si le compte existe
        $successMessage = 'Si un compte existe avec cet email, un nouveau mot de passe a été envoyé.';

        if (!$user) {
            return $this->json(['message' => $successMessage]);
        }

        // Génération d'un nouveau mot de passe aléatoire (12 caractères)
        $newPassword = $this->generateRandomPassword();

        // Mise à jour du mot de passe hashé en base de données
        $user->setPassword($hasher->hashPassword($user, $newPassword));
        $em->flush();

        // Envoi de l'email avec le nouveau mot de passe en clair
        $message = (new Email())
            ->from('noreply@arthubb.fr')
            ->to($email)
            ->subject('Votre nouveau mot de passe - ArtHub')
            ->html($this->buildPasswordEmail($newPassword, $user->getUsername()));

        $mailer->send($message);

        return $this->json(['message' => $successMessage]);
    }

    /**
     * Génère un mot de passe aléatoire sécurisé.
     */
    private function generateRandomPassword(int $length = 12): string
    {
        $lower = 'abcdefghijklmnopqrstuvwxyz';
        $upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $digits = '0123456789';
        $special = '!@#$%&*';

        // Garantir au moins un caractère de chaque type
        $password = $lower[random_int(0, strlen($lower) - 1)]
            . $upper[random_int(0, strlen($upper) - 1)]
            . $digits[random_int(0, strlen($digits) - 1)]
            . $special[random_int(0, strlen($special) - 1)];

        // Compléter avec des caractères aléatoires
        $allChars = $lower . $upper . $digits . $special;
        for ($i = 4; $i < $length; $i++) {
            $password .= $allChars[random_int(0, strlen($allChars) - 1)];
        }

        // Mélanger le mot de passe pour éviter un pattern prévisible
        return str_shuffle($password);
    }

    /**
     * Construit le contenu HTML de l'email de réinitialisation.
     */
    private function buildPasswordEmail(string $password, string $username): string
    {
        return <<<HTML
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Bonjour {$username},</h2>
            <p>Vous avez demandé la réinitialisation de votre mot de passe sur <strong>ArtHub</strong>.</p>
            <p>Voici votre nouveau mot de passe :</p>
            <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; text-align: center; font-size: 20px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; border: 1px solid #ddd;">
                {$password}
            </div>
            <p style="color: #666;">Nous vous recommandons de changer ce mot de passe après votre prochaine connexion.</p>
            <p style="color: #999; font-size: 12px;">Si vous n'avez pas fait cette demande, contactez-nous immédiatement.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">L'équipe ArtHub</p>
        </div>
        HTML;
    }
}
