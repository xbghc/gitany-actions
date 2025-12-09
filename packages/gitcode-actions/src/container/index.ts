// ==================== 新 API（推荐使用） ====================

// 容器创建
export { createContainer } from './create.js';
export type { CreateContainerConfig, CreateContainerResult } from './create.js';

// 容器查询
export { getContainerById, findContainers, getContainerInfo } from './query.js';
export type { ContainerInfo } from './query.js';

// 容器生命周期
export {
  startContainer,
  stopContainer,
  removeContainer,
  removeContainersByLabels,
  cleanupManagedContainers,
  createRawContainer,
} from './lifecycle.js';

// 工作流 API
export { prepare } from './prepare.js';
export type { PrepareTarget } from './prepare.js';

export { resetContainer } from './reset.js';
export type { ResetContainerOptions } from './reset.js';

export { exec } from './exec.js';
export type { ExecOptions, ExecResult } from './exec.js';

// ==================== 通用工具 ====================

// 镜像和文件操作
export { ImagePullError, prepareImage } from './prepare-image.js';
export type { ImagePullStatus } from './prepare-image.js';
export { copyToContainer, CopyToContainerError } from './copy-files.js';
export type { CopyToContainerOptions } from './copy-files.js';

// 工具和类型
export { docker } from './shared.js';
export type { ContainerWithModem } from './docker-types.js';
export type { ContainerOptions } from './types.js';
