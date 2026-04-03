<?php

namespace App\Command;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:create-admin',
    description: 'Crée un utilisateur administrateur',
)]
class CreateAdminUserCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $passwordHasher,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('username', null, InputOption::VALUE_REQUIRED, "Nom d'utilisateur", 'admin')
            ->addOption('email', null, InputOption::VALUE_REQUIRED, 'Adresse e-mail', 'admin@arthub.fr')
            ->addOption('password', null, InputOption::VALUE_REQUIRED, 'Mot de passe');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $username = (string) $input->getOption('username');
        $email    = (string) $input->getOption('email');
        $password = (string) $input->getOption('password');

        if ($password === '') {
            $password = $io->askHidden('Mot de passe pour l\'administrateur');
            if (!$password) {
                $io->error('Le mot de passe est obligatoire.');
                return Command::FAILURE;
            }
        }

        // Vérifie si un admin existe déjà avec ce nom ou cet email
        $repo = $this->em->getRepository(User::class);
        if ($repo->findOneBy(['email' => $email])) {
            $io->warning("Un utilisateur avec l'e-mail « $email » existe déjà.");
            return Command::FAILURE;
        }

        $user = new User();
        $user->setUsername($username);
        $user->setEmail($email);
        $user->setRoles(['ROLE_ADMIN']);
        $user->setPassword($this->passwordHasher->hashPassword($user, $password));
        $user->setCreatedAt(new \DateTimeImmutable());

        $this->em->persist($user);
        $this->em->flush();

        $io->success("Administrateur « $username » ($email) créé avec succès.");

        return Command::SUCCESS;
    }
}
