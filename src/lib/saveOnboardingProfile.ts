import { setLocalArtistProfile } from "@/lib/localProfile";

export type OnboardingProfileInput = {
  artistName: string;
  bio: string;
  avatarImageUrl: string | null;
  heroImageUrl: string | null;
};

type SaveOptions = {
  isLocalGuest: boolean;
  updateProfile: (args: {
    artistName: string | null;
    bio: string | null;
    heroImageUrl: string | null;
    avatarImageUrl: string | null;
  }) => Promise<unknown>;
  ensureUser?: () => Promise<void>;
};

export async function saveOnboardingProfile(
  input: OnboardingProfileInput,
  options: SaveOptions,
): Promise<void> {
  const artistName = input.artistName.trim();
  const bio = input.bio.trim();
  const heroImageUrl = input.heroImageUrl?.trim() || null;
  const avatarImageUrl = input.avatarImageUrl?.trim() || null;

  await setLocalArtistProfile({
    artistName,
    bio,
    heroImageUrl,
    avatarImageUrl,
    links: [],
  });

  if (!options.isLocalGuest) {
    if (options.ensureUser) {
      await options.ensureUser();
    }
    await options.updateProfile({
      artistName: artistName || null,
      bio: bio || null,
      heroImageUrl,
      avatarImageUrl,
    });
  }
}
