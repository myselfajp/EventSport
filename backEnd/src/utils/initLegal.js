import LegalDocument from '../models/legalDocumentModel.js';
import { migrateStaticContractsToLegal } from './migrateStaticContractsToLegal.js';

const DEFAULT_KVKK = {
    docType: 'kvkk',
    title: 'KVKK',
    content: 'KVKK (Personal Data Protection) text can be added here. Edit via Admin panel.',
};

const DEFAULT_TERMS = {
    docType: 'terms',
    title: 'Terms & Conditions',
    content: 'Terms and Conditions text can be added here. You can edit via Admin panel.',
};

const DEFAULT_DISTANCE_SELLING = {
    docType: 'distance_selling',
    title: 'Mesafeli Satış Sözleşmesi (Sporcu)',
    content: `<div class="space-y-6 text-sm text-gray-800 dark:text-slate-200">
  <div class="text-center pb-4 border-b border-gray-200 dark:border-slate-700">
    <h2 class="text-xl font-bold uppercase tracking-wide">Mesafeli Satış Sözleşmesi (Sporcu / Katılımcı)</h2>
    <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">6502 Sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği Uyarınca Düzenlenmiştir</p>
  </div>

  <section class="space-y-3">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white">MADDE 1 – TARAFLAR</h3>
    
    <div class="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-lg border border-gray-200 dark:border-slate-700 space-y-2">
      <h4 class="font-semibold text-cyan-700 dark:text-cyan-400">1.1. SATICI (Platform / Aracı Hizmet Sağlayıcı)</h4>
      <p><strong>Unvan:</strong> EventSport Spor ve Teknoloji A.Ş.</p>
      <p><strong>Adres:</strong> Türkiye</p>
      <p><strong>E-posta:</strong> info@eventsport.com</p>
      <p><strong>Web Sitesi:</strong> www.eventsport.com</p>
    </div>

    <div class="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-lg border border-gray-200 dark:border-slate-700 space-y-2">
      <h4 class="font-semibold text-emerald-700 dark:text-emerald-400">1.2. ALICI (Sporcu / Katılımcı)</h4>
      <p><strong>Adı Soyadı:</strong> <span class="font-medium text-gray-900 dark:text-white">{{ALICI_AD_SOYAD}}</span></p>
      <p><strong>E-posta:</strong> <span class="font-medium text-gray-900 dark:text-white">{{ALICI_EPOSTA}}</span></p>
      <p><strong>Telefon:</strong> <span class="font-medium text-gray-900 dark:text-white">{{ALICI_TELEFON}}</span></p>
      <p><strong>Konum / İl - İlçe:</strong> <span class="font-medium text-gray-900 dark:text-white">{{ALICI_KONUM}}</span></p>
      <p><strong>Sözleşme / Onay Tarihi:</strong> <span class="font-medium text-gray-900 dark:text-white">{{TARIH}}</span></p>
    </div>
  </section>

  <section class="space-y-2">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white">MADDE 2 – SÖZLEŞMENİN KONUSU VE KAPSAMI</h3>
    <p>İşbu Sözleşme, ALICI'nın EventSport platformu üzerinden elektronik ortamda satın aldığı spor etkinliklerine, maçlara, turnuvalara veya antrenman organizasyonlarına katılım hakkı, rezervasyon ve biletleme hizmetlerine ilişkindir. 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri uyarınca tarafların hak ve yükümlülüklerini kapsar.</p>
  </section>

  <section class="space-y-2">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white">MADDE 3 – HİZMET BEDELİ VE ÖDEME</h3>
    <p>Etkinlik katılım bedeli, etkinlik detay sayfasında ve ödeme ekranında açıkça belirtilen ve ALICI tarafından onaylanan tutardır. Ödeme kredi kartı, banka kartı veya platformun desteklediği güvenli ödeme sistemleri üzerinden tahsil edilir.</p>
  </section>

  <section class="space-y-2">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white">MADDE 4 – SPORCU SAĞLIK VE GÜVENLİK BEYANI</h3>
    <p>ALICI; ilgili spor etkinliğine katılmak için fiziksel ve tıbbi açıdan yeterli olduğunu, spor yapmasına engel teşkil edebilecek herhangi bir kronik rahatsızlığı veya doktor yasağı bulunmadığını gayrikabili rücu beyan ve taahhüt eder. Etkinlik esnasında meydana gelebilecek kişisel sakatlık veya kazalarda, platformun kusuru bulunmayan hallerde EventSport sorumlu tutulamaz.</p>
  </section>

  <section class="space-y-2">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white">MADDE 5 – CAYMA HAKKI VE İSTİSNASI</h3>
    <p>Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesinin 1. fıkrasının (g) bendi uyarınca; <em>"Belirli bir tarihte veya dönemde yapılması gereken, konaklama, eşya taşıma, araba kiralama, yiyecek-içecek tedariki ve eğlence veya dinlenme amacıyla yapılan boş zamanın değerlendirilmesine ilişkin sözleşmelerde cayma hakkı kullanılamaz."</em></p>
    <p>Bu doğrultuda, belirli bir tarih ve saatte gerçekleşecek olan spor etkinliklerine katılım biletlerinde yasal cayma hakkı bulunmamaktadır. Ancak organizatör tarafından mücbir sebeplerle iptal edilen etkinliklerde katılım bedeli ALICI'ya eksiksiz iade edilir.</p>
  </section>

  <section class="space-y-2">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white">MADDE 6 – UYUŞMAZLIKLARIN ÇÖZÜMÜ</h3>
    <p>İşbu Sözleşme'den doğabilecek uyuşmazlıklarda Ticaret Bakanlığı'nca her yıl belirlenen parasal sınırlar dahilinde ALICI'nın yerleşim yerindeki Tüketici Hakem Heyetleri ile Tüketici Mahkemeleri yetkilidir.</p>
  </section>

  <section class="pt-4 border-t border-gray-200 dark:border-slate-700">
    <p class="text-xs text-gray-500 dark:text-slate-400">ALICI, platform üzerinden ilgili kutucuğu onaylayarak işbu sözleşmenin tüm maddelerini okuduğunu, anladığını ve elektronik ortamda kabul ettiğini beyan etmiştir. İşlem Tarihi: <strong>{{TARIH}}</strong></p>
  </section>
</div>`,
};

const DEFAULT_COACH_DISTANCE_SELLING = {
    docType: 'coach_distance_selling',
    title: 'Mesafeli Satış Sözleşmesi (Koç)',
    content: `<div class="space-y-6 text-sm text-gray-800 dark:text-slate-200">
  <div class="text-center pb-4 border-b border-gray-200 dark:border-slate-700">
    <h2 class="text-xl font-bold uppercase tracking-wide">Mesafeli Satış Sözleşmesi (Antrenör / Koç)</h2>
    <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">EventSport Koçluk Üyelik Paketleri, Teklif Kredileri ve Platform Servis Alımları Sözleşmesi</p>
  </div>

  <section class="space-y-3">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white">MADDE 1 – TARAFLAR</h3>
    
    <div class="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-lg border border-gray-200 dark:border-slate-700 space-y-2">
      <h4 class="font-semibold text-cyan-700 dark:text-cyan-400">1.1. SAĞLAYICI (Platform)</h4>
      <p><strong>Unvan:</strong> EventSport Spor ve Teknoloji A.Ş.</p>
      <p><strong>Adres:</strong> Türkiye</p>
      <p><strong>E-posta:</strong> coach@eventsport.com</p>
      <p><strong>Web Sitesi:</strong> www.eventsport.com</p>
    </div>

    <div class="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-lg border border-gray-200 dark:border-slate-700 space-y-2">
      <h4 class="font-semibold text-emerald-700 dark:text-emerald-400">1.2. ALICI (Antrenör / Koç)</h4>
      <p><strong>Adı Soyadı:</strong> <span class="font-medium text-gray-900 dark:text-white">{{ALICI_AD_SOYAD}}</span></p>
      <p><strong>Uzmanlık / Branş:</strong> <span class="font-medium text-gray-900 dark:text-white">{{KOC_BRANS}}</span></p>
      <p><strong>E-posta:</strong> <span class="font-medium text-gray-900 dark:text-white">{{ALICI_EPOSTA}}</span></p>
      <p><strong>Telefon:</strong> <span class="font-medium text-gray-900 dark:text-white">{{ALICI_TELEFON}}</span></p>
      <p><strong>Konum / İl - İlçe:</strong> <span class="font-medium text-gray-900 dark:text-white">{{ALICI_KONUM}}</span></p>
      <p><strong>Sözleşme / Onay Tarihi:</strong> <span class="font-medium text-gray-900 dark:text-white">{{TARIH}}</span></p>
    </div>
  </section>

  <section class="space-y-2">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white">MADDE 2 – SÖZLEŞMENİN KONUSU VE KAPSAMI</h3>
    <p>İşbu Sözleşme, ALICI Koç'un EventSport platformu üzerinden antrenörlük faaliyetlerini yürütmek, yeni sporcular edinmek, "Coach Me" sistemi üzerinden gelen hizmet taleplerine teklif vermek (teklif kredileri), etkinlik açma limitlerini artırmak (Üyelik Paketleri - Basic, Pro, Elite vb.) veya platformun dijital koçluk araçlarını satın almasına ilişkin tarafların hak ve yükümlülüklerini düzenler.</p>
  </section>

  <section class="space-y-2">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white">MADDE 3 – HİZMET BEDELİ, KREDİLER VE FATURALANDIRMA</h3>
    <p>Satın alınan koçluk üyelik paketinin veya Coach Me teklif kredilerinin bedeli, KDV dahil olarak ödeme adımında belirtilen tutardır. Bedel kredi kartı veya geçerli ödeme yöntemleriyle tahsil edilir. Ödemenin onaylanmasıyla birlikte ilgili haklar ve krediler anında ALICI Koç'un hesabına tanımlanır.</p>
  </section>

  <section class="space-y-2">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white">MADDE 4 – ANINDA İFA VE CAYMA HAKKI İSTİSNASI</h3>
    <p>Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesinin 1. fıkrasının (ğ) bendi gereğince; <em>"Elektronik ortamda anında ifa edilen hizmetler veya tüketiciye anında teslim edilen gayrimaddi mallara ilişkin sözleşmelerde cayma hakkı kullanılamaz."</em></p>
    <p>ALICI Koç'un hesabına tanımlanan üyelik paketleri, ilan hakları ve teklif kredileri anında ifa edilen dijital hizmet niteliğinde olduğundan, onay verildikten sonra cayma hakkı kullanılamaz ve ücret iadesi talep edilemez.</p>
  </section>

  <section class="space-y-2">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white">MADDE 5 – KOÇUN MESLEKİ YÜKÜMLÜLÜKLERİ</h3>
    <p>ALICI Koç, platform üzerinden sporculara vereceği antrenman ve danışmanlık hizmetlerinde ilgili spor federasyonu ve yasal mevzuat standartlarına uygun hareket edeceğini, antrenörlük belgelerinin geçerli olduğunu, sporculara karşı dürüst, profesyonel ve etik kurallara bağlı kalacağını kabul ve taahhüt eder.</p>
  </section>

  <section class="space-y-2">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white">MADDE 6 – UYUŞMAZLIKLARIN ÇÖZÜMÜ</h3>
    <p>İşbu Sözleşme'den kaynaklanabilecek her türlü uyuşmazlığın çözümünde Türk Hukuku uygulanır ve İstanbul (Çağlayan) Mahkemeleri ve İcra Daireleri yetkilidir.</p>
  </section>

  <section class="pt-4 border-t border-gray-200 dark:border-slate-700">
    <p class="text-xs text-gray-500 dark:text-slate-400">ALICI Koç, satın alma adımında işbu mesafeli satış sözleşmesini elektronik ortamda okuyup onaylayarak yürürlüğe sokmuştur. Onay Tarihi: <strong>{{TARIH}}</strong></p>
  </section>
</div>`,
};

const DEFAULT_EVENT_CONTRACT = {
    docType: 'event_contract',
    title: 'Event Agreement',
    content:
        'Event agreement text can be added here. Edit it in Admin panel → Legal.',
};

const DEFAULT_COMMERCIAL_MESSAGES = {
    docType: 'commercial_messages',
    title: 'Commercial Electronic Messages Consent (IYS)',
    content:
        '<p>This text describes consent for commercial electronic messages (SMS, email, phone) under applicable Turkish law and IYS (Message Management System) requirements.</p><p>Edit this content in Admin panel → Legal → Commercial messages.</p><p>Users who opt in during registration or profile setup agree to receive campaigns, promotions, and informational messages at the contact details they provide.</p>',
};

export const initLegal = async () => {
    try {
        const hasKvkk = await LegalDocument.findOne({ docType: 'kvkk', isActive: true });
        if (!hasKvkk) {
            const existingKvkk = await LegalDocument.findOne({ docType: 'kvkk' }).sort({ version: -1 });
            const version = (existingKvkk?.version ?? 0) + 1;
            await LegalDocument.create({
                ...DEFAULT_KVKK,
                version,
                isActive: true,
            });
            console.log('✅ Default KVKK (v' + version + ') created and set active.');
        }

        const hasTerms = await LegalDocument.findOne({ docType: 'terms', isActive: true });
        if (!hasTerms) {
            const existingTerms = await LegalDocument.findOne({ docType: 'terms' }).sort({ version: -1 });
            const version = (existingTerms?.version ?? 0) + 1;
            await LegalDocument.create({
                ...DEFAULT_TERMS,
                version,
                isActive: true,
            });
            console.log('✅ Default Terms & Conditions (v' + version + ') created and set active.');
        }

        const hasDistance = await LegalDocument.findOne({ docType: 'distance_selling', isActive: true });
        if (!hasDistance) {
            const existing = await LegalDocument.findOne({ docType: 'distance_selling' }).sort({ version: -1 });
            const version = (existing?.version ?? 0) + 1;
            await LegalDocument.create({
                ...DEFAULT_DISTANCE_SELLING,
                version,
                isActive: true,
            });
            console.log('✅ Default Distance Selling Agreement (v' + version + ') created and set active.');
        } else if (hasDistance.content?.trim() === 'tsat') {
            hasDistance.title = DEFAULT_DISTANCE_SELLING.title;
            hasDistance.content = DEFAULT_DISTANCE_SELLING.content;
            await hasDistance.save();
            console.log('✅ Distance Selling Agreement updated with detailed template.');
        }

        const hasCoachDistance = await LegalDocument.findOne({ docType: 'coach_distance_selling', isActive: true });
        if (!hasCoachDistance) {
            const existing = await LegalDocument.findOne({ docType: 'coach_distance_selling' }).sort({ version: -1 });
            const version = (existing?.version ?? 0) + 1;
            await LegalDocument.create({
                ...DEFAULT_COACH_DISTANCE_SELLING,
                version,
                isActive: true,
            });
            console.log('✅ Default Distance Selling Agreement (Coach) (v' + version + ') created and set active.');
        } else if (hasCoachDistance.content?.trim() === 'tsat') {
            hasCoachDistance.title = DEFAULT_COACH_DISTANCE_SELLING.title;
            hasCoachDistance.content = DEFAULT_COACH_DISTANCE_SELLING.content;
            await hasCoachDistance.save();
            console.log('✅ Coach Distance Selling Agreement updated with detailed template.');
        }

        const hasEvent = await LegalDocument.findOne({ docType: 'event_contract', isActive: true });
        if (!hasEvent) {
            const existing = await LegalDocument.findOne({ docType: 'event_contract' }).sort({ version: -1 });
            const version = (existing?.version ?? 0) + 1;
            await LegalDocument.create({
                ...DEFAULT_EVENT_CONTRACT,
                version,
                isActive: true,
            });
            console.log('✅ Default Event Agreement (v' + version + ') created and set active.');
        }

        const hasCommercial = await LegalDocument.findOne({
            docType: 'commercial_messages',
            isActive: true,
        });
        if (!hasCommercial) {
            const existing = await LegalDocument.findOne({ docType: 'commercial_messages' }).sort({
                version: -1,
            });
            const version = (existing?.version ?? 0) + 1;
            await LegalDocument.create({
                ...DEFAULT_COMMERCIAL_MESSAGES,
                version,
                isActive: true,
            });
            console.log(
                '✅ Default Commercial messages / IYS consent (v' + version + ') created and set active.'
            );
        }

        await migrateStaticContractsToLegal();
    } catch (err) {
        console.error('❌ Error initializing legal documents:', err.message);
    }
};
