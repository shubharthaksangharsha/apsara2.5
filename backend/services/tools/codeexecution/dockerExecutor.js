// backend/services/tools/codeexecution/dockerExecutor.js
import Docker from 'dockerode';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const CONTAINER_IMAGE = 'apsara-python-env';
const FILE_STORAGE_PATH = path.join(process.cwd(), 'uploads/code');

export class PythonDockerExecutor {
  constructor() {
    this.docker = new Docker();
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(FILE_STORAGE_PATH, { recursive: true });
    } catch (error) {
      console.error('Failed to create directories:', error);
    }
  }

  async executeCode(code, files = []) {
    const sessionId = uuidv4();
    const sessionPath = path.join(FILE_STORAGE_PATH, sessionId);
    await fs.mkdir(sessionPath, { recursive: true });
    
    // Add special code to make /mnt/data available
    const codeWithDataDir = 
      `import os\n` +
      `os.makedirs('/code/mnt/data', exist_ok=True)\n` +
      `# User code starts here\n` +
      code;
    
    // Write code to file
    const codePath = path.join(sessionPath, 'script.py');
    await fs.writeFile(codePath, codeWithDataDir);
    
    // Copy any user files to session directory
    for (const file of files) {
      const filePath = path.join(sessionPath, file.name);
      await fs.copyFile(file.path, filePath);
    }
    
    // Run container with mounted volume
    const container = await this.docker.createContainer({
      Image: CONTAINER_IMAGE,
      Cmd: ['python', '/code/script.py'],
      HostConfig: {
        Binds: [
          `${sessionPath}:/code:rw`,
          `${sessionPath}:/code/mnt/data:rw` // Make /mnt/data point to the session directory
        ],
        NetworkMode: 'none' // Disable network for security
      }
    });
    
    await container.start();
    const output = await container.wait();
    const logs = await container.logs({stdout: true, stderr: true});
    await container.remove();
    
    // Capture output files (specifically from /mnt/data)
    const outputFiles = await this.captureOutputFiles(sessionPath);
    
    return {
      exitCode: output.StatusCode,
      stdout: logs.toString(),
      sessionId,
      files: outputFiles
    };
  }
  
  async captureOutputFiles(sessionPath) {
    try {
      const files = await fs.readdir(sessionPath);
      const fileDetails = await Promise.all(
        files
          .filter(file => file !== 'script.py')
          .map(async file => {
            const filePath = path.join(sessionPath, file);
            const stats = await fs.stat(filePath);
            
            return {
              name: file,
              path: filePath,
              size: stats.size,
              downloadUrl: `/api/code/files/${path.basename(sessionPath)}/${file}`,
              // Add expiration (10 minutes from now)
              expiry: Date.now() + 10 * 60 * 1000
            };
          })
      );
      return fileDetails;
    } catch (error) {
      console.error('Error capturing output files:', error);
      return [];
    }
  }
}
