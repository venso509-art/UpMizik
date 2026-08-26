import { MusicItem, ArtistUser, DonationItem, PubItem, RpaItem, ArchiveRecord, CommentItem, SocialPost, SocialPostComment, ArtistInboxMessage } from '../types';

export const INITIAL_ARTISTS: ArtistUser[] = [];

export const INITIAL_MUSIC: MusicItem[] = [];

export const INITIAL_DONATIONS: DonationItem[] = [];

export const INITIAL_PUBS: PubItem[] = [];

export const INITIAL_RPA: RpaItem[] = [];

export const INITIAL_ARCHIVES: ArchiveRecord[] = [];

export const INITIAL_COMMENTS: CommentItem[] = [];

export const INITIAL_SOCIAL_POSTS: SocialPost[] = [];

export const INITIAL_SOCIAL_POST_COMMENTS: Record<string, SocialPostComment[]> = {};

export const INITIAL_ARTIST_INBOX: ArtistInboxMessage[] = [];
