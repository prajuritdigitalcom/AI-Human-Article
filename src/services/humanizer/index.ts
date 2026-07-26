import { HumanizerRule } from '../../types';

export const DEFAULT_HUMANIZER_RULES: HumanizerRule[] = [
  {
    id: 'anti_ai_opening',
    title: 'Anti-AI Opening & Indonesian Cliché Banning',
    description: 'Menghindari pembuka klise seperti "Lebih dari sekadar...", "Bukan lagi sekadar...", "Aroma khas...", "In today\'s fast-paced world", atau pengulangan judul kaku.',
    enabled: true,
    exampleBad: 'Sauna kayu bukan lagi sekadar impian. Di sinilah layanan custom menjadi solusi efisien.',
    exampleGood: 'Ingin punya ruang relaksasi pribadi di rumah? Sauna kayu custom jawaban paling masuk akal.',
  },
  {
    id: 'burstiness_variety',
    title: 'Burstiness & Dynamic Rhythm',
    description: 'Mengombinasikan kalimat ultra-pendek yang tegas dengan penjelasan kompleks untuk memecah pola statistik AI.',
    enabled: true,
    exampleBad: 'Sauna kayu sangat disukai karena memiliki banyak sekali manfaat kesehatan yang baik.',
    exampleGood: 'Simpel. Sauna kayu memberikan terapi panas yang langsung meredakan pegal otot.',
  },
  {
    id: 'banned_buzzwords',
    title: 'Banned AI Vocabulary & Phrase Patterns',
    description: 'Menghapus pola AI khas seperti "Dulu X, kini Y", "Tak heran jika...", "Sering kali timbul pertanyaan", "delve", "tapestry", "seamless".',
    enabled: true,
    exampleBad: 'Dulu sauna identik dengan hotel mewah. Kini tren tersebut telah bergeser.',
    exampleGood: 'Dulu hanya ada di hotel berbintang. Sekarang, pemilik rumah pribadi pun banyak yang pasang sendiri.',
  },
  {
    id: 'natural_transitions',
    title: 'Natural Paragraph Cadence',
    description: 'Menghindari kata transisi mekanis ("Selain itu", "Bukan hanya itu", "Oleh karena itu", "Furthermore") di setiap awal paragraf.',
    enabled: true,
    exampleBad: 'Selain itu, faktor kayu sangat berpengaruh. Lebih dari itu, sistem pemanas harus tepat.',
    exampleGood: 'Pilihan jenis kayu menentukan daya tahan. Untuk pemanasnya sendiri, ada dua opsi utama.',
  },
  {
    id: 'human_tone_and_voice',
    title: 'Active Voice & Pragmatic Tone',
    description: 'Menggunakan gaya penyampaian praktisi berpengalaman, kata kerja aktif, serta sudut pandang interaktif (Anda, Kita).',
    enabled: true,
    exampleBad: 'Dapat disimpulkan bahwa pemilihan material kayu sauna adalah hal yang sangat krusial.',
    exampleGood: 'Jangan asal pilih kayu. Salah jenis, sauna Anda bisa cepat lapuk atau berjamur.',
  },
  {
    id: 'wordpress_seo_format',
    title: 'WordPress HTML & SEO Tags',
    description: 'Menghasilkan struktur HTML bersih (H1, H2, H3, FAQ, Gambar, Internal Link) yang siap di-paste ke Classic Editor.',
    enabled: true,
    exampleBad: '```markdown # Title **Bold** ```',
    exampleGood: '<h2 class="...">Judul Sub-Topik</h2> <p>Paragraf artikel...</p>',
  },
];

const RULES_STORAGE_KEY = 'ai_human_custom_rules';

export function getHumanizerRules(): HumanizerRule[] {
  try {
    const raw = localStorage.getItem(RULES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_HUMANIZER_RULES;
  } catch (err) {
    return DEFAULT_HUMANIZER_RULES;
  }
}

export function toggleHumanizerRule(id: string): HumanizerRule[] {
  const current = getHumanizerRules();
  const updated = current.map((rule) => {
    if (rule.id === id) {
      return { ...rule, enabled: !rule.enabled };
    }
    return rule;
  });
  try {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving rules:', err);
  }
  return updated;
}
