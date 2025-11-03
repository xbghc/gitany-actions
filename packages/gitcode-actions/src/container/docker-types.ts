import type Docker from 'dockerode';

/**
 * Container 的实际 modem 类型与顶级 Dockerode 的 modem 类型相同
 * 虽然 @types/dockerode 将 Container.modem 声明为 any，
 * 但运行时它是 DockerModem 实例（与 Dockerode.modem 类型相同）
 */
export type ContainerWithModem = Omit<Docker.Container, 'modem'> & {
  modem: Docker['modem'];
};
