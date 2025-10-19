import type Docker from 'dockerode';
import type { Logger } from '../utils/logger.js';

export interface PrepareImageOptions {
  docker: Docker;
  image: string;
  verbose?: boolean;
  log: Logger;
}

export type ImagePullStatus = 'exists' | 'pulled';

export class ImagePullError extends Error {}

export async function prepareImage({
  docker,
  image,
  verbose = false,
  log,
}: PrepareImageOptions): Promise<ImagePullStatus> {
  try {
    await docker.getImage(image).inspect();
    log.debug(`🐳 镜像 ${image} 已存在`);
    return 'exists';
  } catch {
    log.debug(`🐳 拉取镜像 ${image}...`);
    return await new Promise<ImagePullStatus>((resolve, reject) => {
      docker.pull(image, (err: unknown, stream: NodeJS.ReadableStream | undefined) => {
        if (err) return reject(new ImagePullError(String(err)));
        if (!stream) return reject(new ImagePullError('Docker pull stream is undefined'));
        if (verbose) {
          stream.on('data', (d: Buffer) => {
            try {
              log.debug(d.toString());
            } catch {
              /* ignore */
            }
          });
        }
        stream.on('end', () => resolve('pulled'));
        stream.on('error', (e: unknown) => reject(new ImagePullError(String(e))));
      });
    });
  }
}
