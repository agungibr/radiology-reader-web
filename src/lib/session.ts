/**
 * Konteks file aktif sesi ini (di memori saja, tidak persisted).
 * Diisi halaman Viewer, dibaca form Dosimetri.
 */
import { writable } from 'svelte/store';
import type { DicomMetadata } from './dicom';

export interface ActiveFile {
  name: string;
  kind: 'dicom' | 'image';
  image: { data: Uint8ClampedArray; width: number; height: number };
  metadata: DicomMetadata | null;
}

export const activeFile = writable<ActiveFile | null>(null);
