import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const androidRoot = resolve(root, 'android', 'app', 'src', 'main');
const manifestPath = resolve(androidRoot, 'AndroidManifest.xml');

await readFile(manifestPath, 'utf8');
await mkdir(resolve(androidRoot, 'res', 'drawable'), { recursive: true });
await mkdir(resolve(androidRoot, 'res', 'mipmap-anydpi-v26'), { recursive: true });
await mkdir(resolve(androidRoot, 'res', 'values'), { recursive: true });

const foreground = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp"
    android:viewportWidth="108" android:viewportHeight="108">
  <path android:fillColor="#00000000" android:strokeColor="#35415F" android:strokeWidth="1"
      android:pathData="M20,54 A34,34 0,1 1,88 54 A34,34 0,1 1,20 54" />
  <path android:fillColor="#253D55" android:strokeColor="#45F4FF" android:strokeWidth="2.4"
      android:pathData="M38,42 L54,26 L70,42 L54,58 Z" />
  <path android:fillColor="#34325C" android:strokeColor="#A46BFF" android:strokeWidth="2.4"
      android:pathData="M38,66 L54,50 L70,66 L54,82 Z" />
  <path android:fillColor="#FFFFFF" android:pathData="M50,50 L58,50 L58,58 L50,58 Z" />
</vector>
`;
const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/ic_launcher_background" />
  <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`;
const background = `<?xml version="1.0" encoding="utf-8"?>
<resources><color name="ic_launcher_background">#050510</color></resources>
`;

// Capacitor creates ic_launcher_background.xml. Replace that value rather than
// defining the same colour in a second values file, which Android rejects.
await rm(resolve(androidRoot, 'res', 'values', 'colors.xml'), { force: true });
await Promise.all([
  writeFile(resolve(androidRoot, 'res', 'drawable', 'ic_launcher_foreground.xml'), foreground),
  writeFile(resolve(androidRoot, 'res', 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptive),
  writeFile(resolve(androidRoot, 'res', 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptive),
  writeFile(resolve(androidRoot, 'res', 'values', 'ic_launcher_background.xml'), background)
]);

console.log('Applied ONE MORE LOOP Android icon and colour branding.');
