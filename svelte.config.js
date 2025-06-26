import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { preprocessMeltUI, sequence } from '@melt-ui/pp';

const config = {
  preprocess: sequence([
    vitePreprocess(),
    preprocessMeltUI()
  ]),
  kit: {
    adapter: adapter(),
    alias: {
      $components: 'src/lib/components',
      $utils: 'src/lib/utils',
      $stores: 'src/lib/stores',
      $firebase: 'src/lib/firebase'
    }
  }
};

export default config;