const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

describe('本地同步文件夹写入测试', () => {
  const tempDir = path.join(require('os').tmpdir(), 'CloudDiskSyncTest');
  const targetFile = path.join(tempDir, 'test_upload.txt');

  beforeAll(async () => {
    await fsp.mkdir(tempDir, { recursive: true });
    global.window = global.window || {};
    window.electronAPI = {
      fs: {
        writeFile: async (p, data) => {
          try {
            await fsp.mkdir(path.dirname(p), { recursive: true });
            await fsp.writeFile(p, Buffer.isBuffer(data) ? data : Buffer.from(data));
            return { success: true };
          } catch (e) {
            return { success: false, error: e.message };
          }
        }
      }
    };
  });

  afterAll(async () => {
    try { await fsp.rm(tempDir, { recursive: true, force: true }); } catch {}
  });

  test('能够向本地同步文件夹写入文件', async () => {
    const content = Buffer.from('hello sync');
    const res = await window.electronAPI.fs.writeFile(targetFile, content);
    expect(res.success).toBe(true);
    const exists = fs.existsSync(targetFile);
    expect(exists).toBe(true);
    const read = await fsp.readFile(targetFile, 'utf8');
    expect(read).toBe('hello sync');
  });
});