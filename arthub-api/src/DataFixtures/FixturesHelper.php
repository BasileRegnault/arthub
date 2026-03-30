<?php

namespace App\DataFixtures;

use Symfony\Component\HttpFoundation\File\UploadedFile;

class FixturesHelper
{
    public static function file(string $filename): UploadedFile
    {
        return new UploadedFile(
            __DIR__ . '/images/' . $filename,
            $filename,
            null,
            null,
            true
        );
    }
}
