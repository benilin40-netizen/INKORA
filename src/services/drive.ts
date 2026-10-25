import { getCachedAccessToken } from './firebase';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';

export const DriveService = {
  async getAuthHeaders(): Promise<HeadersInit> {
    const token = getCachedAccessToken();
    if (!token) throw new Error('Not authenticated with Google Drive');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  },

  async listFiles(query: string): Promise<any[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id, name, mimeType)`, {
      headers,
    });
    if (!response.ok) throw new Error('Failed to list files');
    const data = await response.json();
    return data.files || [];
  },

  async createFolder(name: string, parentId?: string): Promise<string> {
    const headers = await this.getAuthHeaders();
    const body = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    };
    const response = await fetch(`${DRIVE_API_URL}/files`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Failed to create folder');
    const data = await response.json();
    return data.id;
  },

  async uploadFile(name: string, content: string, parentId?: string): Promise<string> {
    const headers = await this.getAuthHeaders();
    const body = {
      name,
      parents: parentId ? [parentId] : undefined,
    };
    const response = await fetch(`${DRIVE_API_URL}/files?uploadType=multipart`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'multipart/related; boundary=foo_bar_baz',
      },
      body: `--foo_bar_baz
Content-Type: application/json; charset=UTF-8

${JSON.stringify(body)}
--foo_bar_baz
Content-Type: text/plain

${content}
--foo_bar_baz--`,
    });
    if (!response.ok) throw new Error('Failed to upload file');
    const data = await response.json();
    return data.id;
  }
};
