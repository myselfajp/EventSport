# Dağıtım

Üretim sunucusu: **161.35.114.238** — http://161.35.114.238

## Sürüm çıkmak

Dağıtım `main`'e push ile değil, **etiket** ile tetiklenir:

```bash
git checkout main && git pull
git tag -a v1.3.0 -m "kısa açıklama"
git push origin v1.3.0
```

Bu kadar. GitHub Actions imajları derler, GHCR'a gönderir ve sunucuya mavi/yeşil
olarak uygular. İlerlemeyi **Actions** sekmesinden izleyebilirsiniz; tipik süre
3–5 dakika.

Aynı etiketi yeniden uygulamak için: Actions → Deploy → **Run workflow** → etiketi yaz.

## Mavi/yeşil nasıl çalışıyor

Sunucuda uygulamanın iki kopyası var — `blue` ve `green`. Her an yalnızca biri
trafik alır. Bir dağıtım:

1. **pasif** renge yeni imajı kurar (canlı renk dokunulmadan çalışmaya devam eder),
2. yeni rengin `/api/health` uçlarını yanıtlamasını bekler,
3. ancak sağlıklıysa nginx'i ona çevirir,
4. eski rengi durdurur — ama **silmez**, geri dönüş için orada bekler.

Sağlık kontrolünden geçemeyen bir sürüm trafiğe hiç ulaşmaz: script yeni rengi
kaldırır ve site eski sürümde kalır. Yani başarısız bir dağıtım siteyi düşürmez.

Hangi rengin yayında olduğu:

```bash
ssh root@161.35.114.238 'grep ^map /home/EventSport/nginx/active-color.conf'
```

## Geri dönüş

Sürüm çıktı, site ayakta ama bir şey bozuk:

```bash
ssh root@161.35.114.238 'cd /home/EventSport && bash scripts/rollback-bluegreen.sh'
```

Önceki renk durdurulmuş halde beklediği için bu saniyeler sürer; yeniden derleme
veya indirme yok.

**Dikkat: bu yalnızca kodu geri alır, veriyi değil.** İki renk tek bir veritabanını
paylaşır. Geri aldığınız sürüm veri yapısını değiştirdiyse, dağıtımın kendi aldığı
yedeği geri yüklemeniz gerekir:

```bash
ssh root@161.35.114.238 'ls -1t /var/backups/eventsport/mongo-*.archive.gz | head -3'
```

Her dağıtım, hiçbir şeye dokunmadan önce veritabanının yedeğini alır ve son 5
yedeği saklar.

## Ortam değişkenleri

`.env` **depoda değildir**, sunucuda `/home/EventSport/.env` içinde durur.
Yeni bir değişken eklerken üç yeri birden güncelleyin, yoksa compose onu sessizce
boş string olarak geçer:

1. sunucudaki `.env`
2. `.env.example`
3. `docker-compose.bluegreen.yml` içindeki `x-backend-env` bloğu

`NEXT_PUBLIC_*` değişkenleri istisnadır: bunlar derleme anında Next.js paketinin
içine gömülür, çalışma anında okunmaz. Bu yüzden depo **değişkenlerinde** tutulur
(Settings → Secrets and variables → Actions → Variables). Sunucu adresi değişirse
orayı güncelleyip yeni bir etiket atmak gerekir — `.env`'i düzeltmek yetmez.

## Veritabanı volume'ü

`docker-compose.bluegreen.yml` içindeki `volumes:` bloğu `external: true` ve
`name: eventsport_mongodb_data_prod` ile sabitlenmiştir. **Bu bloğu değiştirmeyin.**

`external` veya `name` kaldırılırsa compose sessizce YENİ ve BOŞ bir volume
oluşturup onu bağlar; veri silinmez ama site bomboş açılır. Bu 2026-06-16'da bir
kez yaşandı. `deploy-bluegreen.sh` her dağıtımdan önce bu bağlantıyı doğrular ve
uyuşmazsa dağıtımı reddeder.

## Bilinen eksikler

- **HTTPS yok.** Site düz HTTP üzerinden IP ile yayında. Bir alan adı bağlandığında
  443 zaten güvenlik duvarında açık; Let's Encrypt eklemek yeterli.
- **Eski sunucu (143.198.141.222) hâlâ açık** ve kendi veritabanıyla çalışıyor.
  Alan adı olmadığı için temiz bir geçiş yok: o adresi bilen herkes hâlâ oraya
  gidiyor. İki taraf birbirinden habersiz veri yazıyor.
