"use client";

// Tiny i18n: an EN/CS dictionary + a useT() hook + a navbar toggle.
// Czech localisation is part of the Best UX Flow story for a Prague-local product.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "cs";

type Dict = Record<string, { en: string; cs: string }>;

const DICT: Dict = {
  // Home / onboarding
  "home.eyebrow": { en: "The town square · est. mmxxvi", cs: "Náměstí · zal. mmxxvi" },
  "home.headline.line1": { en: "Claim your", cs: "Zapečeť své" },
  "home.headline.italic": { en: "name", cs: "jméno" },
  "home.headline.line2": { en: "in Prague", cs: "v Praze" },
  "home.subhead": {
    en: "One name does the work of an account, a profile, a website and a sealed letterbox. The reputation you build with it is yours — it follows the human, not the platform.",
    cs: "Jedno jméno zastane účet, profil, web i zapečetěnou schránku. Reputace, kterou si jím vybudujete, je vaše — putuje s člověkem, ne s platformou.",
  },
  "home.subhead.mobile": {
    en: "The name is the seal. The seal is the person. Reputation will be yours, not ours.",
    cs: "Jméno je pečeť. Pečeť je člověk. Reputace bude patřit vám, ne nám.",
  },
  "home.assurances": { en: "NON-CUSTODIAL · END-TO-END SEALED · LOCAL CURRENCY FIRST", cs: "NON-CUSTODIAL · ZAPEČETĚNO OD KONCE KE KONCI · KČ NA PRVNÍM MÍSTĚ" },
  "home.browse": { en: "or browse the town square →", cs: "nebo se podívejte na náměstí →" },
  "home.hero.kicker": { en: "Inscription", cs: "Zápis" },

  // Onboarding form
  "onboard.choose": { en: "choose a name to inscribe", cs: "vyberte jméno k zápisu" },
  "onboard.checking": { en: "consulting the registrar…", cs: "konzultuji s rejstříkem…" },
  "onboard.taken": { en: "is already taken — try another", cs: "je již obsazeno — zkuste jiné" },
  "onboard.available": { en: "is available · 1st year on us", cs: "je volné · první rok zdarma" },
  "onboard.button.seal": { en: "SEAL THE NAME", cs: "ZAPEČETIT JMÉNO" },
  "onboard.button.claim": { en: "CLAIM", cs: "PŘIHLÁSIT" },
  "onboard.help.signedout": { en: "The fee for the first year is on us. Your account is created when you press the seal.", cs: "Poplatek za první rok je na nás. Účet vznikne, jakmile přitisknete pečeť." },
  "onboard.help.signedin": { en: "Press to seal. Two signatures: one to inscribe your name, one to derive your private-gift route. Both are free.", cs: "Stiskněte pečeť. Dva podpisy: jeden zapíše jméno, druhý odvodí trasu soukromých darů. Oba zdarma." },

  // Navbar
  "nav.townsquare": { en: "Town square", cs: "Náměstí" },
  "nav.letterbox": { en: "Letterbox", cs: "Schránka" },
  "nav.compose": { en: "Post an offer", cs: "Vyvěsit nabídku" },
  "nav.edit": { en: "Edit your seal", cs: "Upravit pečeť" },
  "nav.wallet": { en: "Ledger", cs: "Kniha" },
  "nav.signin": { en: "SIGN IN", cs: "PŘIHLÁSIT" },
  "nav.signout": { en: "SIGN OUT", cs: "ODHLÁSIT" },

  // Feed
  "feed.eyebrow": { en: "The town square", cs: "Náměstí" },
  "feed.title": { en: "Today's notices", cs: "Dnešní vyhlášky" },
  "feed.handsAtWork": { en: "hands at work", cs: "rukou při práci" },
  "feed.search": { en: "seek a craftsman, a favor…", cs: "hledejte řemeslníka, službu…" },
  "feed.neighbourhood": { en: "NEIGHBOURHOOD", cs: "ČTVRŤ" },
  "feed.empty.title": { en: "QUIET DAY ON THE SQUARE", cs: "TICHÝ DEN NA NÁMĚSTÍ" },
  "feed.empty.body": { en: "No offers posted yet. Be the first hand at work.", cs: "Zatím žádné nabídky. Buďte první ruka při práci." },
  "feed.empty.cta": { en: "POST AN OFFER", cs: "VYVĚSIT NABÍDKU" },

  // Profile
  "profile.byHandOf": { en: "BY THE HAND OF", cs: "RUKOU" },
  "profile.verified": { en: "VERIFIED HUMAN", cs: "OVĚŘENÝ ČLOVĚK" },
  "profile.privateGift": { en: "SEND A PRIVATE GIFT", cs: "POSLAT SOUKROMÝ DAR" },
  "profile.sealedLetter": { en: "SEND A SEALED LETTER", cs: "ZAPEČETĚNÝ DOPIS" },
  "profile.openThread": { en: "OPEN THREAD", cs: "OTEVŘÍT VLÁKNO" },
  "profile.wall": { en: "The wall", cs: "Zeď" },
  "profile.wallSealed": { en: "sealed", cs: "zapečetěno" },
  "profile.sealedReceipts": { en: "Sealed receipts", cs: "Zapečetěné stvrzenky" },
  "profile.blankLedger": { en: "BLANK LEDGER", cs: "PRÁZDNÁ KNIHA" },
  "profile.blankBody": { en: "No tips on this wall yet.", cs: "Zatím žádné dary na této zdi." },
  "profile.privacyNote": {
    en: "Tips landing at sealed gift-route addresses are deliberately invisible to the public — only their scanner detects them.",
    cs: "Dary, které dorazí na zapečetěné stealth adresy, jsou veřejně neviditelné — odhalí je jen jejich scanner.",
  },
  "profile.giftBlurb": { en: "your gift will reach", cs: "váš dar dorazí" },
  "profile.giftBlurb2": { en: "without revealing the address it lands at — by design", cs: "aniž by odhalil adresu, na kterou dopadne — záměrně" },
  "profile.openThreadBlurb": { en: "open an end-to-end encrypted thread keyed by", cs: "otevřete koncově šifrované vlákno klíčované přes" },
  "profile.openThreadBlurb2": { en: "on XMTP", cs: "na XMTP" },
  "profile.unclaimed": { en: "UNCLAIMED INSCRIPTION", cs: "NEZAPEČETĚNÝ ZÁPIS" },
  "profile.unclaimedBody": {
    en: "No-one has yet sealed this name in PragueConnect. The page will be carved when its bearer presses the seal.",
    cs: "Toto jméno v Praze nikdo nezapečetil. Stránka vznikne, jakmile jí nositel přitiskne pečeť.",
  },
  "profile.claim": { en: "CLAIM A NAME", cs: "ZÍSKAT JMÉNO" },
  "profile.pressSeal": { en: "PRESS THE SEAL", cs: "PŘITISKNOUT PEČEŤ" },

  // Tip
  "tip.kicker": { en: "SEND A SEALED GIFT", cs: "POSLAT ZAPEČETĚNÝ DAR" },
  "tip.amount": { en: "AMOUNT — ETH ON BASE", cs: "ČÁSTKA — ETH NA BASE" },
  "tip.amountHint": { en: "0.001 ETH ≈ a token of thanks", cs: "0.001 ETH ≈ symbolický dík" },
  "tip.memo": { en: "A WORD WITH IT (optional, on-chain)", cs: "SLOVO K NĚMU (nepovinné, on-chain)" },
  "tip.memoPlaceholder": { en: "With thanks for the bicycle.", cs: "S díky za kolo." },
  "tip.button.sign": { en: "SIGN IN TO SEAL THE GIFT", cs: "PŘIHLÁSIT SE A ZAPEČETIT" },
  "tip.button.send": { en: "PRESS THE SEAL", cs: "PŘITISKNOUT PEČEŤ" },
  "tip.successHint": {
    en: "One transaction: the gift announces itself to the recipient's scanner and lands at a fresh address.",
    cs: "Jedna transakce: dar se ohlásí scanneru příjemce a dopadne na čerstvou adresu.",
  },
  "tip.fallbackHint": {
    en: "When the recipient seals their gift route, this transfer will be unlinkable.",
    cs: "Až si příjemce zapečetí stealth trasu, převod bude nespojitelný.",
  },
  "tip.faucet": { en: "GET TESTNET ETH ↗", cs: "ZÍSKAT TESTNET ETH ↗" },
  "tip.notEnough": { en: "not enough for", cs: "nestačí na" },
  "tip.gasBuffer": { en: "+ gas", cs: "+ gas" },

  // Thread / XMTP
  "thread.kicker": { en: "SEALED LETTER TO", cs: "ZAPEČETĚNÝ DOPIS PRO" },
  "thread.signedOut": { en: "SIGNED OUT", cs: "ODHLÁŠENO" },
  "thread.signinBody": {
    en: "Sign in to open a sealed thread. Your wallet signs once for the XMTP installation key — every message after is end-to-end encrypted.",
    cs: "Přihlaste se a otevřete zapečetěné vlákno. Peněženka jednou podepíše instalační klíč XMTP — každá zpráva poté je koncově šifrovaná.",
  },
  "thread.preparing": {
    en: "Sign the prompt to seal your XMTP installation key. After this you won't be asked again on this device.",
    cs: "Podepište výzvu a zapečetíte svůj instalační klíč XMTP. Poté už vás na tomto zařízení nepoprosí.",
  },
  "thread.empty": { en: "No letters yet. Be the first to write.", cs: "Zatím žádné dopisy. Buďte první." },
  "thread.placeholder": { en: "Write to", cs: "Napište" },
  "thread.button.send": { en: "SEAL", cs: "ZAPEČETIT" },
  "thread.button.sending": { en: "…", cs: "…" },
  "thread.footer": { en: "END-TO-END ENCRYPTED · XMTP V3 / MLS · DEV NET", cs: "KONCOVĚ ŠIFROVÁNO · XMTP V3 / MLS · DEV SÍŤ" },
  "thread.back": { en: "← back to", cs: "← zpět na" },
  "thread.peerBackSuffix": { en: "'s seal", cs: " · pečeť" },
  "thread.notFound": { en: "NO SUCH NAME", cs: "TAKOVÉ JMÉNO NEEXISTUJE" },
  "thread.notFoundBody": {
    en: "hasn't been claimed in PragueConnect. Threads only work between sealed names.",
    cs: "v Praze nezapečetili. Vlákna fungují jen mezi zapečetěnými jmény.",
  },
  "thread.backToSquare": { en: "BACK TO THE SQUARE", cs: "ZPĚT NA NÁMĚSTÍ" },

  // Magnum Opus / escrow
  "opus.kicker": { en: "ESCROW ON BASE", cs: "ESCROW NA BASE" },
  "opus.fund": { en: "FUND THE WORK", cs: "ZAPLATIT PRÁCI" },
  "opus.accept": { en: "ACCEPT THE WORK", cs: "PŘIJMOUT PRÁCI" },
  "opus.deliver": { en: "MARK DELIVERED", cs: "OZNAČIT JAKO HOTOVÉ" },
  "opus.release": { en: "RELEASE WITH FIVE SEALS", cs: "UVOLNIT PĚTI PEČETĚMI" },
  "opus.amount": { en: "amount —", cs: "částka —" },
  "opus.waitingAccept": { en: "waiting to accept…", cs: "čeká se na přijetí…" },
  "opus.atWork": { en: "is at work…", cs: "pracuje…" },
  "opus.deliveredWaiting": { en: "delivered — awaiting release", cs: "odevzdáno — čekáme na uvolnění" },
  "opus.released": { en: "✓ released — receipt is sealed", cs: "✓ uvolněno — stvrzenka zapečetěna" },
  "opus.youFunded": { en: "you funded", cs: "zaplatili jste" },
  "opus.youAreWorker": { en: "you are the worker", cs: "jste pracovník" },
  "opus.between": { en: "between two others", cs: "mezi dvěma jinými" },

  // Receipt
  "receipt.kicker": { en: "By this receipt", cs: "Touto stvrzenkou" },
  "receipt.sealed": { en: "Sealed gift recorded", cs: "Zapečetěný dar zaznamenán" },
  "receipt.pending": { en: "Pending the seal", cs: "Čeká na pečeť" },
  "receipt.notFound": { en: "No such receipt", cs: "Stvrzenka neexistuje" },
  "receipt.from": { en: "FROM", cs: "OD" },
  "receipt.to": { en: "STEALTH RECIPIENT", cs: "STEALTH PŘÍJEMCE" },
  "receipt.amount": { en: "AMOUNT", cs: "ČÁSTKA" },
  "receipt.memo": { en: "WORD WITH IT", cs: "SLOVO" },
  "receipt.block": { en: "BLOCK", cs: "BLOK" },
  "receipt.privacyBlurb": {
    en: "The recipient's ENS name does not appear in the on-chain trail. Their scanner picks up the announcement via ScopeLift's canonical ERC-5564 announcer and finds the funds at the stealth address above.",
    cs: "ENS jméno příjemce se v on-chain stopě neobjeví. Scanner příjemce zachytí ohlášení přes kanonický ERC-5564 announcer ScopeLift a najde prostředky na výše uvedené stealth adrese.",
  },
  "receipt.basescan": { en: "VIEW ON BASESCAN ↗", cs: "ZOBRAZIT NA BASESCAN ↗" },
  "receipt.stealthAddr": { en: "STEALTH ADDRESS ↗", cs: "STEALTH ADRESA ↗" },
  "receipt.backToSquare": { en: "← back to the town square", cs: "← zpět na náměstí" },

  // Wallet
  "wallet.kicker": { en: "THE LEDGER", cs: "KNIHA" },
  "wallet.balance": { en: "WALLET BALANCE", cs: "ZŮSTATEK PENĚŽENKY" },
  "wallet.received": { en: "GIFTS RECEIVED", cs: "PŘIJATÉ DARY" },
  "wallet.given": { en: "GIFTS GIVEN", cs: "DANÉ DARY" },
  "wallet.recent": { en: "RECENT", cs: "NEDÁVNÉ" },
  "wallet.recentTitle": { en: "Sealed receipts", cs: "Zapečetěné stvrzenky" },
  "wallet.blankBook": { en: "BLANK BOOK", cs: "PRÁZDNÁ KNIHA" },
  "wallet.blankBody": {
    en: "No on-chain receipts yet. Send a private gift on a profile, or wait for one to arrive.",
    cs: "Zatím žádné on-chain stvrzenky. Pošlete soukromý dar na něčím profilu nebo počkejte, až nějaký dorazí.",
  },
  "wallet.privacyNote": {
    en: "Gifts arriving at your sealed gift-route addresses don't appear here — only your scanner detects them. That's the privacy property.",
    cs: "Dary, které přijdou na vaše stealth adresy, se zde neobjevují — odhalí je jen váš scanner. To je princip soukromí.",
  },
  "wallet.noStealth": { en: "No stealth gift route set yet.", cs: "Stealth trasa darů ještě není nastavena." },
  "wallet.sealOne": { en: "Seal one →", cs: "Zapečetit ji →" },

  // Owner panel
  "owner.kicker": { en: "WELCOME — YOUR NEXT STEPS", cs: "VÍTEJTE — DALŠÍ KROKY" },
  "owner.step.bio.label": { en: "Write your bio & catalogue", cs: "Napište životopis a katalog" },
  "owner.step.bio.sub": { en: "A paragraph about who you are and what you fix.", cs: "Odstavec o tom, kdo jste a co opravujete." },
  "owner.step.offer.label": { en: "Post your first offer", cs: "Vyvěste první nabídku" },
  "owner.step.offer.sub": { en: "Or a request — what do you need from the city?", cs: "Nebo žádost — co potřebujete od města?" },
  "owner.step.stealth.label": { en: "Seal your private-gift route", cs: "Zapečeťte trasu soukromých darů" },
  "owner.step.stealth.sub": { en: "ERC-5564 stealth address so gifts are unlinkable.", cs: "ERC-5564 stealth adresa, aby dary nešly spojit." },

  // Edit
  "edit.kicker": { en: "EDIT YOUR SEAL", cs: "UPRAVIT PEČEŤ" },
  "edit.fields.displayName": { en: "DISPLAY NAME", cs: "ZOBRAZOVANÉ JMÉNO" },
  "edit.fields.bio": { en: "BIO", cs: "ŽIVOTOPIS" },
  "edit.fields.location": { en: "LOCATION", cs: "MÍSTO" },
  "edit.fields.avatar": { en: "AVATAR URL", cs: "URL AVATARU" },
  "edit.skills.kicker": { en: "THE CATALOGUE", cs: "KATALOG" },
  "edit.skills.title": { en: "Skills offered", cs: "Nabízené dovednosti" },
  "edit.skills.add": { en: "+ ADD A SKILL", cs: "+ PŘIDAT DOVEDNOST" },
  "edit.stealth.kicker": { en: "THE PRIVATE GIFT ROUTE", cs: "TRASA SOUKROMÝCH DARŮ" },
  "edit.stealth.title": { en: "Stealth meta-address", cs: "Stealth meta-adresa" },
  "edit.stealth.body": {
    en: "Sign once and we derive an ERC-5564 stealth meta-address for you. Senders use it to drop gifts at fresh addresses no-one can link back to your name.",
    cs: "Jeden podpis a odvodíme vám ERC-5564 stealth meta-adresu. Dárci s ní zasílají dary na čerstvé adresy, které nikdo nespojí s vaším jménem.",
  },
  "edit.stealth.sealed": { en: "✓ SEALED ROUTE", cs: "✓ ZAPEČETĚNÁ TRASA" },
  "edit.stealth.reseal": { en: "RE-SEAL ROUTE", cs: "ZNOVU ZAPEČETIT" },
  "edit.stealth.generate": { en: "GENERATE STEALTH ROUTE", cs: "VYTVOŘIT STEALTH TRASU" },
  "edit.button.save": { en: "SEAL THE CHANGES", cs: "ZAPEČETIT ZMĚNY" },

  // Compose
  "compose.kicker": { en: "POST TO THE TOWN SQUARE", cs: "VYVĚSIT NA NÁMĚSTÍ" },
  "compose.byHandOf": { en: "by the hand of", cs: "rukou" },
  "compose.youOffer": { en: "YOU OFFER —", cs: "NABÍZÍTE —" },
  "compose.youRequest": { en: "YOU REQUEST —", cs: "ŽÁDÁTE —" },
  "compose.youGive": { en: "YOU OFFER FREELY —", cs: "DÁVÁTE ZDARMA —" },
  "compose.sayMore": { en: "SAY MORE —", cs: "POVĚZTE VÍC —" },
  "compose.underSign": { en: "UNDER WHICH SIGN —", cs: "POD JAKÝM ZNAKEM —" },
  "compose.forWork": { en: "FOR THE WORK — USD", cs: "ZA PRÁCI — Kč" },
  "compose.where": { en: "WHERE — neighbourhood", cs: "KDE — čtvrť" },
  "compose.button.seal": { en: "SEAL & POST", cs: "ZAPEČETIT A VYVĚSIT" },

  // CROPS hallmark + explainer
  "crops.footer.line": {
    en: "sealed by your own hand · forkable · MIT",
    cs: "zapečetěno vlastní rukou · forkovatelné · MIT",
  },
  "crops.title": { en: "The four marks of the seal", cs: "Čtyři znaky pečetě" },
  "crops.intro": {
    en: "Every parchment in PragueConnect carries this hallmark. Four engravings around a fleur-de-lis. Each is a property the product is built to keep.",
    cs: "Každý pergamen v PragueConnect nese tento znak. Čtyři rytiny kolem lilie. Každá je vlastnost, kterou chceme držet.",
  },
  "crops.cr.kicker": { en: "FIRST MARK · BROKEN CHAIN", cs: "PRVNÍ ZNAK · ZLÁMANÝ ŘETĚZ" },
  "crops.cr.title": { en: "Censorship-resistant", cs: "Odolné cenzuře" },
  "crops.cr.body": {
    en: "Your page lives on IPFS and resolves through ENS. No company can take it down — not even us. The address of the page is yours.",
    cs: "Vaše stránka žije na IPFS a překládá se přes ENS. Žádná firma ji nemůže stáhnout — ani my. Adresa stránky patří vám.",
  },
  "crops.os.kicker": { en: "SECOND MARK · UNFOLDED SCROLL", cs: "DRUHÝ ZNAK · ROZBALENÝ SVITEK" },
  "crops.os.title": { en: "Open as a seal", cs: "Otevřené jako pečeť" },
  "crops.os.body": {
    en: "Every line of code is public. The protocol is a few text records and two contracts — small enough to fork for any city. Berlinconnect, Lisbonconnect — go.",
    cs: "Každý řádek kódu je veřejný. Protokol je pár text-recordů a dva kontrakty — dost malý na to, aby se daly forknout pro libovolné město. Berlinconnect, Lisbonconnect — do toho.",
  },
  "crops.priv.kicker": { en: "THIRD MARK · SEALED LETTER", cs: "TŘETÍ ZNAK · ZAPEČETĚNÝ DOPIS" },
  "crops.priv.title": { en: "Private by default", cs: "Soukromé ve výchozím stavu" },
  "crops.priv.body": {
    en: "Tips arrive at fresh stealth addresses that nobody can link back to your name. Threads are end-to-end encrypted. Even your familiar drafts under a sealed roof.",
    cs: "Dary dorazí na čerstvé stealth adresy, které nikdo nedokáže spojit s vaším jménem. Vlákna jsou koncově šifrovaná. I váš familiár tvoří pod zapečetěnou střechou.",
  },
  "crops.sec.kicker": { en: "FOURTH MARK · LION'S KEY", cs: "ČTVRTÝ ZNAK · LVÍ KLÍČ" },
  "crops.sec.title": { en: "Secure as the metal", cs: "Bezpečné jako kov" },
  "crops.sec.body": {
    en: "Hardware wallets that read ERC-7730 see the names, not the hex. The contracts are minimal, audited where it matters, and the funds never sit on our books.",
    cs: "Hardwarové peněženky, které čtou ERC-7730, vidí jména, ne hex. Kontrakty jsou minimální, auditované tam, kde to má váhu, a prostředky nikdy nesedí v naší knize.",
  },
  "crops.signature": {
    en: "this is the maker's mark — pragueconnect for ETHPrague 2026",
    cs: "to je značka tvůrce — pragueconnect pro ETHPrague 2026",
  },
  "crops.back": { en: "← back", cs: "← zpět" },

  // Inheritance pull-tab + sealed-by trail
  "inherit.kicker": { en: "AN INVITATION", cs: "POZVÁNKA" },
  "inherit.youWereLed": { en: "You were led to this seal by", cs: "K této pečeti vás přivedl/a" },
  "inherit.cta": { en: "INSCRIBE MY NAME", cs: "ZAPSAT MÉ JMÉNO" },
  "inherit.dismiss": { en: "later", cs: "později" },
  "profile.sealedBy": { en: "sealed by", cs: "zapečetěno rukou" },
};

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof DICT, fallback?: string) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pragueconnect.lang");
      if (stored === "cs" || stored === "en") setLangState(stored);
    } catch {}
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("pragueconnect.lang", l);
    } catch {}
  }, []);

  const t = useCallback(
    (key: keyof typeof DICT, fallback?: string) => {
      const entry = DICT[key];
      if (!entry) return fallback ?? (key as string);
      return entry[lang] ?? fallback ?? entry.en;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be inside I18nProvider");
  return v;
}

export function useT() {
  return useI18n().t;
}

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "cs" : "en")}
      className="t-mono"
      style={{
        background: "transparent",
        border: "0.5px solid var(--gilded)",
        padding: "4px 8px",
        cursor: "pointer",
        fontSize: 11,
        color: "var(--ink)",
        letterSpacing: "0.1em",
      }}
      aria-label={`switch to ${lang === "en" ? "Czech" : "English"}`}
    >
      {lang === "en" ? "CS" : "EN"}
    </button>
  );
}
