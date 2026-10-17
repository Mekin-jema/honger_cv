export type Photo = { src: string; width: number; height: number; alt: string };

/** Photos shown in the viewer (the side arrows loop through them). Originals live in info/photos/originals. */
export const photos: Photo[] = [
  { src: "/images/mekin.png", width: 800, height: 800, alt: "Mekin Jemal" },
];

/** Face crop of the first photo, used for avatars. */
export const avatarSrc = "/images/mekin.png";
