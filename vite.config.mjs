import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const dir=path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
 root:path.join(dir,'public'),
 base:'./',
 publicDir:path.join(dir,'static'),
 build:{outDir:path.join(dir,'dist'),emptyOutDir:true},
});
