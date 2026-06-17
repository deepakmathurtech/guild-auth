import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadEvidenceFile(userId: string, file: File, folder = 'general') {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `evidence/${userId}/${folder}/${Date.now()}-${safeName}`;
  const task = await uploadBytesResumable(ref(storage, path), file, {
    contentType: file.type,
    customMetadata: { uploadedBy: userId, folder }
  });
  return getDownloadURL(task.ref);
}
