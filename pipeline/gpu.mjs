// H.264 encoder settings: NVIDIA NVENC when an NVIDIA GPU is present (fast; what the original suite was tuned on, an
// RTX 3090), otherwise libx264 on the CPU at matching quality (slower, same look).
//   import { h264 } from '../gpu.mjs';   h264('master' | 'mezz' | 'final')
import { spawnSync } from 'node:child_process';

export const HAS_NVENC = process.env.NO_NVENC ? false : spawnSync('nvidia-smi', ['-L'], { encoding: 'utf8' }).status === 0;

const NV = {
  master: ['-c:v', 'h264_nvenc', '-preset', 'p7', '-tune', 'hq', '-rc', 'vbr', '-cq', '15', '-b:v', '0', '-maxrate', '160M', '-bufsize', '320M', '-profile:v', 'high', '-movflags', '+faststart'],
  mezz: ['-c:v', 'h264_nvenc', '-preset', 'p4', '-rc', 'constqp', '-qp', '15', '-g', '60'],
  final: ['-c:v', 'h264_nvenc', '-preset', 'p6', '-rc', 'vbr', '-cq', '19', '-b:v', '14M', '-maxrate', '20M', '-bufsize', '28M', '-profile:v', 'high'],
};
const CPU = {
  master: ['-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-profile:v', 'high', '-movflags', '+faststart'],
  mezz: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-g', '60'],
  final: ['-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-maxrate', '20M', '-bufsize', '28M', '-profile:v', 'high'],
};
export const h264 = (kind) => [...(HAS_NVENC ? NV : CPU)[kind]];
