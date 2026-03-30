<?php

namespace App\DataFixtures;

use App\Entity\ActivityLog;
use App\Entity\Artist;
use App\Entity\Artwork;
use App\Entity\ArtworkDailyView;
use App\Entity\Gallery;
use App\Entity\MediaObject;
use App\Entity\Rating;
use App\Entity\User;
use App\Entity\UserLoginLog;
use App\Entity\GalleryDailyView;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Faker\Factory;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use App\Entity\ValidationDecision;
use App\Enum\ValidationStatus;
use App\Enum\ValidationSubjectType;

class AppFixtures extends Fixture
{
    private \Faker\Generator $faker;

    private const DEFAULT_SCALE = 1;

    private const USERS_BASE = 8;
    private const ARTISTS_BASE = 12;
    private const ARTWORKS_BASE = 30;

    private const LOGIN_LOGS_MIN_BASE = 1;
    private const LOGIN_LOGS_MAX_BASE = 5;

    private const GALLERY_OWNERS_RATE_BASE = 40;
    private const GALLERY_ARTWORKS_MIN_BASE = 1;
    private const GALLERY_ARTWORKS_MAX_BASE = 8;

    private const RATINGS_MIN_BASE = 0;
    private const RATINGS_MAX_BASE = 6;

    private const DAILY_VIEWS_DAYS_BACK_BASE = 30;
    private const DAILY_VIEWS_ACTIVE_DAYS_MIN_BASE = 5;
    private const DAILY_VIEWS_UNIQUE_MIN_BASE = 0;
    private const DAILY_VIEWS_UNIQUE_MAX_BASE = 50;

    private const ACTIVITY_LOGS_MIN_BASE = 60;
    private const ACTIVITY_LOGS_MAX_BASE = 120;

    public function __construct(
        private readonly UserPasswordHasherInterface $passwordHasher
    ) {
        $this->faker = Factory::create('fr_FR');
    }

    public function load(ObjectManager $manager): void
    {
        $scale = $this->getScale();

        $users = $this->createUsers($manager, $scale);
        $this->createUserLoginLogs($manager, $users, $scale);

        $artists = $this->createArtists($manager, $users, $scale);
        $artworks = $this->createArtworks($manager, $users, $artists, $scale);

        $manager->flush();

        $this->createValidationDecisions($manager, $users, $artists, $artworks);

        $galleries = $this->createGalleries($manager, $users, $artworks, $scale);
        $this->createGalleryDailyViews($manager, $users, $galleries, $scale);
        $this->createRatings($manager, $users, $artworks, $scale);

        $this->createArtworkDailyViews($manager, $users, $artworks, $scale);

        $manager->flush();

        $this->createActivityLogs($manager, $users, $artists, $artworks, $galleries, $scale);

        $manager->flush();
    }

    private function getScale(): int
    {
        $raw = $_ENV['FIXTURES_SCALE'] ?? $_SERVER['FIXTURES_SCALE'] ?? getenv('FIXTURES_SCALE') ?: null;

        if ($raw === null || $raw === '') {
            return self::DEFAULT_SCALE;
        }

        $scale = (int) $raw;

        if ($scale < 1) {
            $scale = 1;
        }
        if ($scale > 10) {
            $scale = 10;
        }

        return $scale;
    }

    private function scaledCount(int $base, int $scale, int $min = 1): int
    {
        $v = (int) round($base * $scale);
        return max($min, $v);
    }

    private function scaledRange(int $minBase, int $maxBase, int $scale, int $minFloor = 0, int $maxFloor = 1): array
    {
        $min = (int) round($minBase * $scale);
        $max = (int) round($maxBase * $scale);

        $min = max($minFloor, $min);
        $max = max($maxFloor, $max);

        if ($max < $min) {
            $max = $min;
        }

        return [$min, $max];
    }

    private function createUsers(ObjectManager $manager, int $scale): array
    {
        $users = [];

        $userMedia = new MediaObject();
        $userMedia->filePath = 'user_fixture.jpg';
        $manager->persist($userMedia);

        $admin = new User();
        $admin->setUsername('admin');
        $admin->setEmail('admin@example.com');
        $admin->setRoles(['ROLE_ADMIN']);
        $admin->setProfilePicture($userMedia);
        $admin->setCreatedAt(new \DateTimeImmutable('-2 years'));
        $admin->setUpdatedAt(new \DateTimeImmutable('-1 year'));
        $admin->setPassword($this->passwordHasher->hashPassword($admin, 'adminpass'));
        $manager->persist($admin);
        $users[] = $admin;

        $count = $this->scaledCount(self::USERS_BASE, $scale, 1);

        for ($i = 0; $i < $count; $i++) {
            $user = new User();
            $user->setUsername($this->faker->userName . $i);
            $user->setEmail($this->faker->unique()->safeEmail);
            $user->setRoles(['ROLE_USER']);
            $user->setIsSuspended(false);
            $user->setProfilePicture($userMedia);

            $created = $this->faker->dateTimeBetween('-2 years', 'now');
            $user->setCreatedAt(\DateTimeImmutable::createFromMutable($created));
            $user->setUpdatedAt(new \DateTimeImmutable());

            $user->setPassword($this->passwordHasher->hashPassword($user, 'password'));
            $manager->persist($user);
            $users[] = $user;
        }

        return $users;
    }

    private function createUserLoginLogs(ObjectManager $manager, array $users, int $scale): void
    {
        $loginEvents = ['login', 'logout', 'failed_login'];
        [$min, $max] = $this->scaledRange(self::LOGIN_LOGS_MIN_BASE, self::LOGIN_LOGS_MAX_BASE, $scale, 0, 1);

        foreach ($users as $user) {
            $logCount = $this->faker->numberBetween($min, $max);

            for ($i = 0; $i < $logCount; $i++) {
                $loginLog = new UserLoginLog();
                $loginLog->setUserConnected($user);
                $loginLog->setIpHash(hash('sha256', $this->faker->ipv4 . 'fixtures_salt_change_me'));
                $loginLog->setEvent($this->faker->randomElement($loginEvents));
                $loginLog->setUserAgent($this->faker->userAgent);
                $loginLog->setMessage($this->faker->boolean(60) ? $this->faker->sentence(8) : null);
                $loginLog->setCreatedAt(
                    \DateTimeImmutable::createFromMutable(
                        $this->faker->dateTimeBetween('-6 months', 'now')
                    )
                );

                $manager->persist($loginLog);
            }
        }
    }

    private function createArtists(ObjectManager $manager, array $users, int $scale): array
    {
        $artists = [];

        $artistMedia = new MediaObject();
        $artistMedia->filePath = 'artists_fixture.jpg';
        $manager->persist($artistMedia);

        $count = $this->scaledCount(self::ARTISTS_BASE, $scale, 1);

        for ($i = 0; $i < $count; $i++) {
            $isConfirmed = $this->faker->boolean(70);

            $artist = new Artist();
            $artist->setFirstname($this->faker->firstName);
            $artist->setLastname($this->faker->lastName);
            $artist->setIsConfirmCreate($isConfirmed);
            $artist->setToBeConfirmed(!$isConfirmed);

            $born = $this->faker->dateTimeBetween('-120 years', '-60 years');
            $artist->setBornAt(\DateTimeImmutable::createFromMutable($born));

            if ($this->faker->boolean(60)) {
                $artist->setDiedAt(null);
            } else {
                $died = $this->faker->dateTimeBetween($born, 'now');
                $artist->setDiedAt(\DateTimeImmutable::createFromMutable($died));
            }

            $artist->setNationality($this->faker->country);
            $artist->setBiography($this->faker->paragraphs(3, true));
            $artist->setProfilePicture($artistMedia);
            $artist->setCreatedAt(new \DateTimeImmutable('-1 year'));
            $artist->setUpdatedAt(new \DateTimeImmutable());

            $creator = $this->faker->randomElement($users);
            $artist->setCreatedBy($creator);
            $artist->setUpdatedBy($creator);

            $manager->persist($artist);
            $artists[] = $artist;
        }

        return $artists;
    }

    private function createArtworks(ObjectManager $manager, array $users, array $artists, int $scale): array
    {
        $artworks = [];

        $types = \App\Enum\ArtworkType::cases();
        $styles = \App\Enum\ArtworkStyle::cases();

        $artMedia = new MediaObject();
        $artMedia->filePath = 'art_fixture.jpg';
        $manager->persist($artMedia);

        $count = $this->scaledCount(self::ARTWORKS_BASE, $scale, 1);

        for ($i = 0; $i < $count; $i++) {
            $isConfirmed = $this->faker->boolean(70);

            $art = new Artwork();
            $art->setTitle(ucfirst($this->faker->words(3, true)));
            $art->setType($this->faker->randomElement($types));
            $art->setStyle($this->faker->randomElement($styles));
            $art->setCreationDate(\DateTimeImmutable::createFromMutable($this->faker->dateTimeBetween('-5 years', 'now')));
            $art->setDescription($this->faker->paragraphs(2, true));
            $art->setImage($artMedia);

            $artist = $this->faker->randomElement($artists);
            $art->setArtist($artist);

            $art->setLocation($this->faker->city);
            $art->setIsDisplay($this->faker->boolean(70));
            $art->setIsConfirmCreate($isConfirmed);
            $art->setToBeConfirmed(!$isConfirmed);
            $art->setCreatedAt(\DateTimeImmutable::createFromMutable($this->faker->dateTimeBetween('-1 year', '-1 month')));
            $art->setUpdatedAt(new \DateTimeImmutable());

            $creator = $this->faker->randomElement($users);
            $art->setCreatedBy($creator);
            $art->setUpdatedBy($creator);

            $manager->persist($art);
            $artworks[] = $art;
        }

        return $artworks;
    }

    private function createGalleries(ObjectManager $manager, array $users, array $artworks, int $scale): array
    {
        $galleries = [];

        $galleryMedia = new MediaObject();
        $galleryMedia->filePath = 'gallery_fixture.jpg';
        $manager->persist($galleryMedia);

        $ownersRate = (int) min(95, max(10, round(self::GALLERY_OWNERS_RATE_BASE + (($scale - 1) * 3))));
        [$min, $max] = $this->scaledRange(self::GALLERY_ARTWORKS_MIN_BASE, self::GALLERY_ARTWORKS_MAX_BASE, $scale, 0, 1);

        foreach ($users as $ownerCandidate) {
            if (!$this->faker->boolean($ownersRate)) {
                continue;
            }

            $gallery = new Gallery();
            $gallery->setName($ownerCandidate->getUsername() . "'s gallery");
            $gallery->setDescription($this->faker->sentence(12));
            $gallery->setCoverImage($galleryMedia);
            $gallery->setIsPublic($this->faker->boolean(60));
            $gallery->setCreatedAt(\DateTimeImmutable::createFromMutable($this->faker->dateTimeBetween('-8 months', '-1 month')));
            $gallery->setUpdatedAt(new \DateTimeImmutable());

            $gallery->setCreatedBy($ownerCandidate);
            $gallery->setUpdatedBy($ownerCandidate);

            $count = $this->faker->numberBetween($min, $max);
            $chosen = [];

            while (count($chosen) < $count && count($chosen) < count($artworks)) {
                $art = $this->faker->randomElement($artworks);
                $chosen[spl_object_id($art)] = $art;
            }

            foreach ($chosen as $art) {
                if (method_exists($gallery, 'addArtwork')) {
                    $gallery->addArtwork($art);
                }
            }

            $manager->persist($gallery);
            $galleries[] = $gallery;
        }

        return $galleries;
    }

    private function createRatings(ObjectManager $manager, array $users, array $artworks, int $scale): void
    {
        [$min, $max] = $this->scaledRange(self::RATINGS_MIN_BASE, self::RATINGS_MAX_BASE, $scale, 0, 1);

        foreach ($artworks as $art) {
            $ratingCount = $this->faker->numberBetween($min, $max);

            for ($r = 0; $r < $ratingCount; $r++) {
                $rating = new Rating();
                $rating->setScore($this->faker->numberBetween(1, 5));
                $rating->setComment($this->faker->boolean(70) ? $this->faker->sentence(12) : null);
                $rating->setArtwork($art);

                $author = $this->faker->randomElement($users);
                $rating->setCreatedBy($author);
                $rating->setUpdatedBy($author);

                if (method_exists($rating, 'setCreatedAt')) {
                    $rating->setCreatedAt(\DateTimeImmutable::createFromMutable($this->faker->dateTimeBetween('-6 months', 'now')));
                }
                if (method_exists($rating, 'setUpdatedAt')) {
                    $rating->setUpdatedAt(new \DateTimeImmutable());
                }

                $manager->persist($rating);
            }
        }
    }

    private function createArtworkDailyViews(ObjectManager $manager, array $users, array $artworks, int $scale): void
    {
        $daysBack = (int) max(7, round(self::DAILY_VIEWS_DAYS_BACK_BASE * (1 + (($scale - 1) * 0.35))));
        $activeMin = (int) max(1, round(self::DAILY_VIEWS_ACTIVE_DAYS_MIN_BASE * $scale));
        $uniqueMin = (int) max(0, round(self::DAILY_VIEWS_UNIQUE_MIN_BASE * $scale));
        $uniqueMax = (int) max(1, round(self::DAILY_VIEWS_UNIQUE_MAX_BASE * (1 + (($scale - 1) * 0.4))));

        $uniqueUserKeys = [];
        $uniqueIpKeys = [];
        $fixtureSalt = 'fixtures_salt_change_me';

        foreach ($artworks as $art) {
            $activeDays = $this->faker->numberBetween(min($activeMin, $daysBack), $daysBack);

            $pickedDayOffsets = [];
            while (count($pickedDayOffsets) < $activeDays) {
                $pickedDayOffsets[(int) $this->faker->numberBetween(0, $daysBack - 1)] = true;
            }

            foreach (array_keys($pickedDayOffsets) as $offset) {
                $viewDate = (new \DateTimeImmutable('today'))->sub(new \DateInterval('P' . $offset . 'D'));
                $dayKey = $viewDate->format('Y-m-d');

                $uniqueViewsToday = $this->faker->numberBetween($uniqueMin, $uniqueMax);

                for ($i = 0; $i < $uniqueViewsToday; $i++) {
                    $isLogged = $this->faker->boolean(70);

                    if ($isLogged) {
                        $viewer = $this->faker->randomElement($users);

                        $k = spl_object_id($art) . '|' . spl_object_id($viewer) . '|' . $dayKey;
                        if (isset($uniqueUserKeys[$k])) {
                            continue;
                        }

                        $uniqueUserKeys[$k] = true;

                        $view = new ArtworkDailyView(
                            artwork: $art,
                            viewDate: $viewDate,
                            user: $viewer,
                            ipHash: null
                        );
                        $manager->persist($view);
                    } else {
                        $ip = $this->faker->ipv4;
                        $ipHash = hash('sha256', $ip . $fixtureSalt);

                        $k = spl_object_id($art) . '|' . $ipHash . '|' . $dayKey;
                        if (isset($uniqueIpKeys[$k])) {
                            continue;
                        }

                        $uniqueIpKeys[$k] = true;

                        $view = new ArtworkDailyView(
                            artwork: $art,
                            viewDate: $viewDate,
                            user: null,
                            ipHash: $ipHash
                        );
                        $manager->persist($view);
                    }
                }
            }
        }
    }

    private function createGalleryDailyViews(ObjectManager $manager, array $users, array $galleries, int $scale): void
    {
        $daysBack = (int) max(7, round(self::DAILY_VIEWS_DAYS_BACK_BASE * (1 + (($scale - 1) * 0.35))));
        $activeMin = (int) max(1, round(self::DAILY_VIEWS_ACTIVE_DAYS_MIN_BASE * $scale));
        $uniqueMin = (int) max(0, round(self::DAILY_VIEWS_UNIQUE_MIN_BASE * $scale));
        $uniqueMax = (int) max(1, round(self::DAILY_VIEWS_UNIQUE_MAX_BASE * (1 + (($scale - 1) * 0.4))));

        $uniqueUserKeys = [];
        $uniqueIpKeys = [];
        $fixtureSalt = 'fixtures_salt_change_me';

        foreach ($galleries as $gallery) {
            $activeDays = $this->faker->numberBetween(min($activeMin, $daysBack), $daysBack);

            $pickedDayOffsets = [];
            while (count($pickedDayOffsets) < $activeDays) {
                $pickedDayOffsets[(int) $this->faker->numberBetween(0, $daysBack - 1)] = true;
            }

            foreach (array_keys($pickedDayOffsets) as $offset) {
                $viewDate = (new \DateTimeImmutable('today'))->sub(new \DateInterval('P' . $offset . 'D'));
                $dayKey = $viewDate->format('Y-m-d');

                $uniqueViewsToday = $this->faker->numberBetween($uniqueMin, $uniqueMax);

                for ($i = 0; $i < $uniqueViewsToday; $i++) {
                    $isLogged = $this->faker->boolean(70);

                    if ($isLogged) {
                        $viewer = $this->faker->randomElement($users);

                        $k = spl_object_id($gallery) . '|' . spl_object_id($viewer) . '|' . $dayKey;
                        if (isset($uniqueUserKeys[$k])) {
                            continue;
                        }

                        $uniqueUserKeys[$k] = true;

                        $view = new GalleryDailyView(
                            gallery: $gallery,
                            viewDate: $viewDate,
                            user: $viewer,
                            ipHash: null
                        );
                        $manager->persist($view);
                    } else {
                        $ip = $this->faker->ipv4;
                        $ipHash = hash('sha256', $ip . $fixtureSalt);

                        $k = spl_object_id($gallery) . '|' . $ipHash . '|' . $dayKey;
                        if (isset($uniqueIpKeys[$k])) {
                            continue;
                        }

                        $uniqueIpKeys[$k] = true;

                        $view = new GalleryDailyView(
                            gallery: $gallery,
                            viewDate: $viewDate,
                            user: null,
                            ipHash: $ipHash
                        );
                        $manager->persist($view);
                    }
                }
            }
        }
    }

    private function createValidationDecisions(
        ObjectManager $manager,
        array $users,
        array $artists,
        array $artworks
    ): void {
        $admin = null;
        foreach ($users as $u) {
            if (in_array('ROLE_ADMIN', $u->getRoles(), true)) {
                $admin = $u;
                break;
            }
        }

        if (!$admin instanceof User) {
            $admin = $this->faker->randomElement($users);
        }

        $artistDecisionsCount = min(count($artists), 8);
        $artworkDecisionsCount = min(count($artworks), 18);

        foreach ($this->faker->randomElements($artists, $artistDecisionsCount) as $artist) {
            $status = $this->faker->boolean(75) ? ValidationStatus::APPROVED : ValidationStatus::REJECTED;

            $decision = (new ValidationDecision())
                ->setSubjectType(ValidationSubjectType::ARTIST)
                ->setSubjectId((int) $artist->getId())
                ->setStatus($status)
                ->setDecidedBy($admin)
                ->setSubmittedBy($artist->getCreatedBy())
                ->setReason($status === ValidationStatus::REJECTED ? $this->faker->sentence(10) : null)
                ->setCreatedAt(\DateTimeImmutable::createFromMutable($this->faker->dateTimeBetween('-3 months', 'now')));

            $manager->persist($decision);

            $artist->setIsConfirmCreate($status === ValidationStatus::APPROVED);
            $artist->setToBeConfirmed(true);
        }

        foreach ($this->faker->randomElements($artworks, $artworkDecisionsCount) as $artwork) {
            $status = $this->faker->boolean(75) ? ValidationStatus::APPROVED : ValidationStatus::REJECTED;

            $decision = (new ValidationDecision())
                ->setSubjectType(ValidationSubjectType::ARTWORK)
                ->setSubjectId((int) $artwork->getId())
                ->setStatus($status)
                ->setDecidedBy($admin)
                ->setSubmittedBy($artwork->getCreatedBy())
                ->setReason($status === ValidationStatus::REJECTED ? $this->faker->sentence(10) : null)
                ->setCreatedAt(\DateTimeImmutable::createFromMutable($this->faker->dateTimeBetween('-3 months', 'now')));

            $manager->persist($decision);

            $artwork->setIsConfirmCreate($status === ValidationStatus::APPROVED);
            $artwork->setToBeConfirmed(true);

            if ($status === ValidationStatus::REJECTED) {
                $artwork->setIsDisplay(false);
            }
        }
    }

    private function createActivityLogs(
        ObjectManager $manager,
        array $users,
        array $artists,
        array $artworks,
        array $galleries,
        int $scale
    ): void {
        $targets = [];
        foreach ($artists as $a) {
            if ($a->getId()) {
                $targets[] = $a;
            }
        }
        foreach ($artworks as $a) {
            if ($a->getId()) {
                $targets[] = $a;
            }
        }
        foreach ($galleries as $g) {
            if ($g->getId()) {
                $targets[] = $g;
            }
        }

        $min = (int) round(self::ACTIVITY_LOGS_MIN_BASE * $scale);
        $max = (int) round(self::ACTIVITY_LOGS_MAX_BASE * $scale);
        if ($max < $min) {
            $max = $min;
        }

        $count = $this->faker->numberBetween($min, $max);

        for ($i = 0; $i < $count; $i++) {
            $entity = $this->faker->randomElement($targets);
            $user = $this->faker->randomElement($users);

            $changes = $this->fakeChangesForEntity($entity);

            $log = new ActivityLog();
            $log->setAction('UPDATE');
            $log->setEntityClass($entity::class);
            $log->setEntityId((int) $entity->getId());
            $log->setUserConnected($user);
            $log->setOldValues($changes['old']);
            $log->setNewValues($changes['new']);
            $log->setCreatedAt(\DateTimeImmutable::createFromMutable($this->faker->dateTimeBetween('-6 months', 'now')));

            $manager->persist($log);
        }
    }

    private function fakeChangesForEntity(object $entity): array
    {
        if ($entity instanceof Artwork) {
            $fields = $this->faker->randomElements(['title', 'description', 'location', 'isDisplay'], $this->faker->numberBetween(1, 3));
            $old = [];
            $new = [];
            foreach ($fields as $f) {
                $old[$f] = $this->faker->sentence(3);
                $new[$f] = $this->faker->sentence(4);
            }
            if (in_array('isDisplay', $fields, true)) {
                $old['isDisplay'] = $this->faker->boolean;
                $new['isDisplay'] = !$old['isDisplay'];
            }
            return ['old' => $old, 'new' => $new];
        }

        if ($entity instanceof Artist) {
            $fields = $this->faker->randomElements(['firstname', 'lastname', 'nationality', 'biography'], $this->faker->numberBetween(1, 2));
            $old = [];
            $new = [];
            foreach ($fields as $f) {
                $old[$f] = $this->faker->sentence(2);
                $new[$f] = $this->faker->sentence(3);
            }
            return ['old' => $old, 'new' => $new];
        }

        if ($entity instanceof Gallery) {
            $fields = $this->faker->randomElements(['name', 'description', 'isPublic'], $this->faker->numberBetween(1, 2));
            $old = [];
            $new = [];
            foreach ($fields as $f) {
                $old[$f] = $this->faker->sentence(2);
                $new[$f] = $this->faker->sentence(3);
            }
            if (in_array('isPublic', $fields, true)) {
                $old['isPublic'] = $this->faker->boolean;
                $new['isPublic'] = !$old['isPublic'];
            }
            return ['old' => $old, 'new' => $new];
        }

        return [
            'old' => ['value' => $this->faker->word],
            'new' => ['value' => $this->faker->word],
        ];
    }
}
