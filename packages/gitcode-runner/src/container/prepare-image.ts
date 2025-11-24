import type Docker from 'dockerode';

export interface PrepareImageOptions {
  docker: Docker;
  image: string;
}

export type ImagePullStatus = 'exists' | 'pulled';

export class ImagePullError extends Error {}

export async function prepareImage({
  docker,
  image,
}: PrepareImageOptions): Promise<ImagePullStatus> {
  try {
    await docker.getImage(image).inspect();
    return 'exists';
  } catch {
    return await new Promise<ImagePullStatus>((resolve, reject) => {
      docker.pull(image, (err: unknown, stream: NodeJS.ReadableStream | undefined) => {
        if (err) return reject(new ImagePullError(String(err)));
        if (!stream) return reject(new ImagePullError('Docker pull stream is undefined'));
        stream.on('end', () => resolve('pulled'));
        stream.on('error', (e: unknown) => reject(new ImagePullError(String(e))));
      });
    });
  }
}
