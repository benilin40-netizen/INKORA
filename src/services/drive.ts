import { getCachedAccessToken } from './firebase';
import { Story } from '../types';

export const DriveService = {
  async getAccessToken(): Promise<string | null> {
    return getCachedAccessToken();
  },

  async findOrCreateFolder(token: string): Promise<string> {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='INOKORA_Stories' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'INOKORA_Stories',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    const folderData = await createRes.json();
    return folderData.id;
  },

  async saveStory(story: Story): Promise<{ success: boolean; fileId?: string; error?: string }> {
    const token = await this.getAccessToken();
    if (!token) {
      return { success: false, error: 'Not authenticated with Google Drive' };
    }

    try {
      const folderId = await this.findOrCreateFolder(token);
      const fileName = `story_${story.id}.json`;
      const fileContent = JSON.stringify(story, null, 2);

      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and '${folderId}' in parents and trashed=false`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const searchData = await searchRes.json();

      if (searchData.files && searchData.files.length > 0) {
        const fileId = searchData.files[0].id;
        const updateRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: fileContent,
        });
        if (updateRes.ok) {
          return { success: true, fileId };
        } else {
          return { success: false, error: 'Failed to update file in Google Drive' };
        }
      } else {
        const metadata = {
          name: fileName,
          parents: [folderId],
          mimeType: 'application/json',
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([fileContent], { type: 'application/json' }));

        const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          method: 'POST',
          body: form,
        });
        const createData = await createRes.json();
        if (createRes.ok) {
          return { success: true, fileId: createData.id };
        } else {
          return { success: false, error: createData.error?.message || 'Failed to create file in Google Drive' };
        }
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Drive API error' };
    }
  },

  async loadStories(): Promise<Story[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    try {
      const folderId = await this.findOrCreateFolder(token);
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const searchData = await searchRes.json();
      if (!searchData.files) return [];

      const stories: Story[] = [];
      for (const file of searchData.files) {
        const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fileRes.ok) {
          const storyData = await fileRes.json();
          if (storyData && storyData.id) {
            stories.push(storyData);
          }
        }
      }
      return stories;
    } catch (e) {
      console.warn('[DriveService] Failed to load stories from Drive:', e);
      return [];
    }
  }
};
