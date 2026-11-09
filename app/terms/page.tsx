import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Brand";
import { BRAND } from "@/lib/brand";
import { GOVERNING_STATE, LEGAL_ADDRESS, LEGAL_EMAIL, LEGAL_UPDATED, MIN_AGE, OPERATOR, TERMS_VERSION, VENUE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The Terms of Service for ${BRAND}: accounts, what you can post, restaurant information, gift cards, disclaimers, limits on liability and how disputes are resolved.`,
  alternates: { canonical: "/terms" },
};

/** a paragraph, a paragraph in capitals (the parts the law wants conspicuous), a list, or a subheading */
type Block = string | { caps: string } | { list: string[] } | { h: string };
type Section = { id: string; title: string; body: Block[] };

const US = `${BRAND}`;

const SECTIONS: Section[] = [
  {
    id: "agreement",
    title: "Agreement to these Terms",
    body: [
      `These Terms of Service (the “Terms”) are a binding legal agreement between you and ${OPERATOR} (“${US},” “we,” “us” or “our”) governing your access to and use of the website at theplatenextdoor.com and every subdomain of it, the ${US} mobile application, The Thursday Plate newsletter, and every other website, application, feature, email, content, tool and service we offer (together, the “Service”).`,
      `By creating an account, signing in, checking a box or tapping a button that says you agree, posting anything, subscribing to anything, or otherwise accessing or using the Service, you confirm that you have read, understood and agree to be bound by these Terms and by our Privacy Policy (at /privacy), which is incorporated into these Terms by reference. If you do not agree to every part of these Terms, you are not permitted to use the Service and you must not create an account or use it.`,
      `If you use the Service on behalf of a business, school, organization or other entity, you represent that you have the authority to bind that entity to these Terms, and “you” includes that entity.`,
      { caps: `Please read these Terms carefully. They contain a binding arbitration agreement and a class action and jury trial waiver (Section 25) that affect how disputes between you and us are resolved, a disclaimer of warranties (Section 20), a limitation of our liability (Section 21), and your agreement to indemnify us (Section 22).` },
    ],
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    body: [
      `We may change these Terms at any time, for any reason, at our sole discretion. When we make a change we consider material, we will update the “Last updated” date at the top of this page and will ask signed-in members to review and agree to the updated Terms before continuing to use their account. Changes take effect when posted, except that changes to Section 25 (Dispute Resolution) will not apply to any dispute of which we had actual notice before the change.`,
      `Your continued access to or use of the Service after a change takes effect means you accept the changed Terms. If you do not agree to a change, your only remedy is to stop using the Service and delete your account.`,
    ],
  },
  {
    id: "eligibility",
    title: "Eligibility",
    body: [
      `You must be at least ${MIN_AGE} years old to create an account or use any part of the Service that requires one. If you are under 18 (or the age of majority where you live), you may use the Service only with the involvement and consent of a parent or legal guardian who has read and agrees to these Terms on your behalf and who accepts responsibility for your use of the Service. The Service is not directed to children under ${MIN_AGE}, and we do not knowingly collect personal information from them. If we learn that a person under ${MIN_AGE} has created an account, we will delete it.`,
      `You may not use the Service if you have previously been suspended or removed from it, if you are barred from using it under the laws of the United States or any other applicable jurisdiction, or if your use would violate any applicable law. The Service is offered for use in the United States; if you access it from anywhere else, you do so on your own initiative and are responsible for complying with local law.`,
    ],
  },
  {
    id: "accounts",
    title: "Your account and its security",
    body: [
      `To use most features you must create an account. You agree to provide accurate, current and complete information, to keep it up to date, to create only one personal account, and not to create an account for anyone else, under a false identity, or using an email address or name you are not authorized to use.`,
      `We sign you in with one-time codes sent to your email address and, where offered, with Google or a passkey; we do not use passwords. You are solely responsible for maintaining the security of the email account, Google account and devices you use to sign in, and for every activity that occurs under your account, whether or not you authorized it. Do not share sign-in codes or links with anyone. Notify us immediately at ${LEGAL_EMAIL} if you believe your account has been accessed without permission.`,
      `We are not liable for any loss or damage arising from your failure to keep your sign-in methods secure, from someone else using your account, or from any unauthorized access to your account that results from circumstances outside our reasonable control. We may refuse, suspend or reclaim any account name or @name at any time, for any reason, including if it impersonates someone, infringes rights, is misleading, or is inactive.`,
    ],
  },
  {
    id: "privacy",
    title: "Privacy",
    body: [
      `Our Privacy Policy explains what information we collect, how we use and share it, and the choices you have. By using the Service you acknowledge that you have read the Privacy Policy and consent to the collection, use and sharing of information as it describes.`,
    ],
  },
  {
    id: "service",
    title: "The Service and restaurant information",
    body: [
      `The Service is a guide to restaurants, coffee shops, bars and other businesses (“Places”) and a platform where members share reviews, ratings, photos, lists, comments and other content. Information about Places (including names, addresses, locations on a map, hours, menus, prices, dishes, photos, ownership, “locally owned” status, awards, honors and whether a Place is open or closed) comes from our own research, public sources, the Places themselves, third-party services and members, and can change or become out of date at any time without notice.`,
      `We do not guarantee, and make no representation, that any information about any Place is accurate, complete, current or reliable. Before you rely on any information, including before you travel to, order from, book or buy anything from a Place, confirm it directly with the Place. Inclusion of a Place on the Service, in a guide, in a list, in Surprise me, in The Thursday Plate, or anywhere else is not an endorsement, recommendation, guarantee or certification of that Place, its food, its safety, its staff, its prices, its business practices or anything else, and the absence of a Place is not a judgment about it. Descriptions such as “locally owned,” “one of the best,” or any ranking are opinions.`,
      `Reviews, ratings, photos, lists and comments are the opinions of the members who posted them, not of ${US}. We do not verify that members visited a Place, the accuracy of what they say, or the identity of every member.`,
      `We may change, suspend, limit or discontinue any part of the Service, any feature or any content, at any time, for any reason, with or without notice, and without liability to you. We have no obligation to provide any support, updates or maintenance.`,
    ],
  },
  {
    id: "risk",
    title: "Food, drink, health and safety: assumption of risk",
    body: [
      `The Service is for general informational and entertainment purposes only. ${US} does not own, operate, manage, inspect or control any Place, and we are not responsible for any Place or for anything that happens at, or as a result of visiting, ordering from or dealing with, any Place.`,
      `You are solely responsible for your own health, safety, dietary needs and decisions. Nothing on the Service is medical, nutritional, allergy, health or safety advice. Information about dishes, ingredients, allergens, dietary options (such as vegetarian, vegan or gluten-free), spice levels or preparation may be wrong or incomplete; always ask the Place directly, especially if you have a food allergy, intolerance, medical condition or dietary restriction.`,
      `You may only buy or consume alcohol if you are of legal drinking age (21 in the United States), and you must drink responsibly and never drive after drinking. References to bars, breweries, cocktails, wine or happy hours are not encouragement to drink.`,
      `You knowingly and voluntarily assume all risks of visiting, traveling to, eating or drinking at, ordering from, or otherwise dealing with any Place or any person you meet through the Service, including risks of foodborne illness, allergic reaction, injury, property damage, theft, crime, traffic accidents and loss. To the fullest extent permitted by law, you release ${US} and the other Plate Parties (defined in Section 21) from all claims arising out of or related to any of those risks.`,
    ],
  },
  {
    id: "content",
    title: "Your content",
    body: [
      `“Your Content” means anything you post, upload, submit or send through the Service, including reviews, ratings, photos, comments, lists, captions, your name, @name, profile picture and bio, places you submit, messages, notes and feedback. You keep whatever ownership rights you have in Your Content.`,
      `By posting or submitting Your Content, you grant ${US} and our successors and assigns a worldwide, non-exclusive, royalty-free, fully paid, transferable and sublicensable license to host, store, reproduce, display, publish, publicly perform, distribute, adapt, modify (for example, to resize or crop photos or fit text to a format), translate, create derivative works of, and otherwise use Your Content, in connection with operating, providing, improving, marketing and promoting the Service and ${US} (for example, in link previews, share images, search results, The Thursday Plate, social media posts and printed materials), in any media now known or later developed. This license continues while Your Content is on the Service and for a reasonable period after you delete it (for example, in backups and caches), and it continues permanently for any copy already included in a newsletter, printed piece, share image, or other material created before you deleted it, and for content you shared with others that they have saved or shared.`,
      `You also grant every member and visitor a limited, non-exclusive license to view and share links to Your Content through the Service as the Service allows. You waive, to the extent permitted by law, any moral rights or rights of attribution or integrity in Your Content as against ${US} and our licensees. You agree that we may display your name, @name and profile picture alongside Your Content.`,
      `You represent and warrant that: (a) you own Your Content or have all rights, licenses, consents and permissions needed to post it and grant the licenses above, including the consent of every identifiable person who appears in a photo; (b) Your Content is true, reflects your honest, first-hand experience, and is not false, misleading or defamatory; (c) Your Content does not infringe, misappropriate or violate anyone’s intellectual property, privacy, publicity or other rights; and (d) Your Content and your posting of it comply with these Terms and all applicable laws.`,
      `We are not obligated to host, display, keep or back up Your Content, and we may refuse, remove, edit, hide, label, or move any of it, at any time, for any reason or no reason, without notice. You are solely responsible for Your Content and for keeping your own copy of anything you want to keep. We are not responsible for any loss of Your Content.`,
    ],
  },
  {
    id: "reviews",
    title: "Review rules and honesty",
    body: [
      `Reviews must be honest and based on your own first-hand experience of the Place. You may not post a review: (a) of a Place you did not visit or order from yourself; (b) of a Place you own, work for, manage, represent, compete with, or have a family, business or financial relationship with; (c) in exchange for any payment, free or discounted food, drink, gift card, service or other benefit, unless the Service clearly allows and labels it; (d) that is copied from somewhere else; or (e) written by, or on behalf of, someone else.`,
      `Businesses and their representatives may not post, buy, sell, solicit, suppress or manipulate reviews, ratings or likes, and may not offer anything to members for posting, changing or removing a review. These rules are intended to follow the Federal Trade Commission’s rule on fake reviews and testimonials (16 C.F.R. Part 465) and other consumer protection laws, and we may report violations to authorities.`,
      `Nobody can pay us to change a review, a rating, its order, or whether it appears, and our moderation decisions are final. The full review rules are on our How we pick page (at /about) and are part of these Terms.`,
    ],
  },
  {
    id: "conduct",
    title: "Things you may not do",
    body: [
      `We have zero tolerance for objectionable content and abusive users. You agree that you will not, and will not help or allow anyone else to:`,
      {
        list: [
          `post or send anything that is unlawful, defamatory, libelous, fraudulent, threatening, harassing, bullying, hateful, discriminatory, obscene, pornographic, sexually explicit, violent, or that promotes self-harm, terrorism, illegal drugs or illegal activity;`,
          `harass, threaten, stalk, intimidate, dox or harm any person, including members, Place owners and staff, or post anyone’s private information (such as a home address, phone number, financial or medical information) or photos of people who did not agree to them;`,
          `impersonate any person or business, misrepresent your identity or affiliation, or create a false or misleading account;`,
          `post fake, incentivized, conflicted, copied, or misleading reviews, ratings, likes or photos, or otherwise manipulate rankings, ratings, Surprise me, lists, badges, follower counts or any metric;`,
          `post spam, chain messages, advertising, promotions or solicitations, or use the Service for any commercial purpose we have not approved in writing;`,
          `infringe or violate any copyright, trademark, patent, trade secret, privacy, publicity or other right of any person;`,
          `access, search, scrape, crawl, copy, harvest or collect data or content from the Service by any automated means (including bots, spiders, scripts, scrapers or AI agents), or use any content from the Service to train or improve any machine-learning or artificial-intelligence model, except as expressly allowed by our robots.txt file for public search engines;`,
          `probe, scan, test or bypass any security, authentication, rate limit, access control or other technical measure; attempt to access any account, data, database, server, system or network that you are not authorized to access; or interfere with or disrupt the Service or anyone’s use of it (including by denial-of-service attacks, flooding, overloading, or introducing viruses, worms, malware or harmful code);`,
          `reverse engineer, decompile, disassemble, decode or otherwise try to derive the source code, algorithms or underlying structure of the Service, except to the extent applicable law expressly allows despite this restriction;`,
          `copy, sell, rent, license, frame, mirror, republish or redistribute the Service or any part of it, or build a competing product or service using it;`,
          `use the Service to violate any law, or in a way that exposes ${US} or anyone else to harm or liability;`,
          `create more than one account, use someone else’s account, or sell, transfer or share your account; or`,
          `encourage, enable or assist anyone else to do any of the above.`,
        ],
      },
      `We may investigate and take any action we consider appropriate in response to a violation, including removing content, suspending or terminating accounts, blocking access, preserving and disclosing information, and reporting to and cooperating with law enforcement, without notice or liability to you.`,
    ],
  },
  {
    id: "moderation",
    title: "Reporting, moderation and our role as a platform",
    body: [
      `Every review, comment and member page can be reported, and you can block or mute other members. We review reports and may, but are not obligated to, remove content or take action. We do not and cannot review all content before it is posted, we are not responsible for monitoring the Service, and we do not endorse any content posted by members. To the fullest extent permitted by law, including Section 230 of the Communications Decency Act (47 U.S.C. § 230), we are not liable for any content provided by members or other third parties, or for any decision to remove or not remove it.`,
      `You understand that by using the Service you may be exposed to content that is inaccurate, offensive, indecent or objectionable, and you agree that you use the Service at your own risk.`,
    ],
  },
  {
    id: "third-parties",
    title: "Third-party sites, services and transactions",
    body: [
      `The Service links to and integrates with websites, apps and services we do not own or control, including the websites of Places, map and directions services, reservation and ordering services, gift card sellers (such as Toast, Square and Instagift), social networks, Google, Apple, our hosting, database and email providers, and others (“Third-Party Services”). We provide these links as a convenience only. We do not endorse, control or assume any responsibility for any Third-Party Service, its content, products, services, prices, availability, privacy practices or security, and your use of any Third-Party Service is at your own risk and governed by that third party’s terms and policies.`,
      `Any purchase, reservation, order, payment, gift card or other transaction you make with a Place or a Third-Party Service, including through a link on the Service, is solely between you and that party. We are not a party to it, do not process its payment, and are not responsible for it, including for delivery, quality, refunds, cancellations, expiration, a Place closing, fraud, or any dispute.`,
    ],
  },
  {
    id: "gift-cards",
    title: "Gift cards",
    body: [
      `${US} does not sell, issue, hold, redeem or guarantee gift cards and never receives your payment for one. When you choose “Gift card,” we send you to the Place’s own gift card page or to a search for it. Gift cards are offered and fulfilled solely by the Place or its provider under their own terms. We do not verify that any page found through a search belongs to the Place; confirm you are on the Place’s official site before buying. A note you send a friend through the Service that a gift card is on the way is only a message; it is not a gift card or a promise that one will arrive.`,
    ],
  },
  {
    id: "sponsored",
    title: "Sponsored content, partners and offers",
    body: [
      `Some content on the Service may be sponsored, featured, presented by, or paid for by a Place or another business, and will be labeled as such. A sponsorship is not an endorsement by ${US}, does not change members’ reviews or ratings, and does not mean we have verified the sponsor’s claims. Any offer, promotion, discount or event shown on the Service is provided by the business offering it, under its own terms, and we are not responsible for it.`,
    ],
  },
  {
    id: "communications",
    title: "Emails, notifications and electronic communications",
    body: [
      `By creating an account you consent to receive electronic communications from us, including sign-in codes, account and security messages, notifications about activity on your account, and messages about changes to these Terms or the Service. If you subscribe to The Thursday Plate or other newsletters, you consent to receive them until you unsubscribe using the link in any issue. You can turn off push notifications in your device settings.`,
      `You agree that all agreements, notices, disclosures and other communications we provide to you electronically, including by posting them on the Service or emailing them to the address on your account, satisfy any legal requirement that they be in writing, and that clicking or tapping to agree is your electronic signature under the federal Electronic Signatures in Global and National Commerce Act and similar laws.`,
    ],
  },
  {
    id: "ip",
    title: "Our intellectual property",
    body: [
      `The Service and everything in it other than Your Content, including our name, logo, the plate and door mark, matchbook cover designs, share images, guides, lists, descriptions, The Thursday Plate, text, graphics, design, software, code, data compilations and selection and arrangement of content, are owned by ${US} or our licensors and are protected by copyright, trademark and other laws. Our names, logos and designs are our trademarks and may not be used without our prior written permission.`,
      `Subject to these Terms, we grant you a limited, personal, non-exclusive, non-transferable, non-sublicensable, revocable license to access and use the Service for your own personal, non-commercial use. All rights not expressly granted to you are reserved by us. Any use of the Service not expressly permitted by these Terms is prohibited and automatically ends this license.`,
    ],
  },
  {
    id: "copyright",
    title: "Copyright complaints (DMCA)",
    body: [
      `We respect intellectual property rights and respond to notices of alleged infringement under the Digital Millennium Copyright Act, 17 U.S.C. § 512. If you believe content on the Service infringes your copyright, send a written notice to our designated agent at ${LEGAL_EMAIL} or by mail to ${LEGAL_ADDRESS}, including: (a) your physical or electronic signature; (b) identification of the copyrighted work; (c) identification of the material you claim is infringing and its location on the Service (such as a link); (d) your name, address, telephone number and email address; (e) a statement that you have a good-faith belief that the use is not authorized by the copyright owner, its agent or the law; and (f) a statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on the owner’s behalf.`,
      `If your content was removed and you believe it was a mistake or misidentification, you may send a counter-notice with the information required by 17 U.S.C. § 512(g)(3). We may terminate the accounts of members who repeatedly infringe. Knowingly misrepresenting that material is infringing, or that it was removed by mistake, may make you liable for damages.`,
    ],
  },
  {
    id: "feedback",
    title: "Feedback",
    body: [
      `If you send us ideas, suggestions, comments or other feedback about the Service or ${US} (“Feedback”), you grant us a perpetual, irrevocable, worldwide, royalty-free, fully paid, transferable and sublicensable right to use, disclose and exploit that Feedback for any purpose without any obligation, attribution or compensation to you. Feedback is not confidential.`,
    ],
  },
  {
    id: "termination",
    title: "Suspension, termination and deleting your account",
    body: [
      `You may stop using the Service at any time and may delete your account from your page or by emailing us. Deleting your account removes your account and Your Content from the Service as described in our Privacy Policy, subject to the license terms in Section 8 and to our right to keep information as required or allowed by law.`,
      `We may suspend, restrict or terminate your access to all or part of the Service, or delete your account or Your Content, at any time, for any reason or no reason, with or without notice, and without liability to you, including if we believe you have violated these Terms, created risk or possible legal exposure for us or others, or if we stop offering the Service. Sections 1, 5, and 8 through 30, and any other provision that by its nature should survive, survive any termination of these Terms or of your account.`,
    ],
  },
  {
    id: "warranties",
    title: "Disclaimer of warranties",
    body: [
      { caps: `To the fullest extent permitted by law, the Service, and all content, information, Places, reviews, ratings, photos, links, features and materials on or available through it, are provided “as is,” “as available” and “with all faults,” without warranties of any kind, express, implied or statutory. ${US} and the other Plate Parties expressly disclaim all warranties, including any implied warranties of merchantability, fitness for a particular purpose, title, non-infringement, quiet enjoyment, accuracy, and any warranties arising from course of dealing, usage or trade.` },
      { caps: `Without limiting the foregoing, we do not warrant that the Service will be uninterrupted, timely, secure, error-free, or free of viruses or other harmful components; that any defects will be corrected; that any information about any Place, or any review, rating or other content, is accurate, complete, current or reliable; that any Place is open, safe, licensed, clean, locally owned, or as described; or that the Service will meet your requirements or expectations. No advice or information, whether oral or written, obtained from us or through the Service creates any warranty not expressly stated in these Terms.` },
      { caps: `No method of transmitting or storing information is completely secure. Although we use reasonable measures to protect information, we cannot and do not guarantee the security of any information, and you use the Service and provide information at your own risk.` },
      `Some jurisdictions do not allow the exclusion of certain warranties, so some of the above may not apply to you. In that case, those warranties are limited to the shortest duration and smallest scope the law allows.`,
    ],
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: [
      `In these Terms, the “Plate Parties” means ${US}, its owners, founders, members, managers, partners, officers, directors, employees, contractors, agents, volunteers, editors, affiliates, licensors, service providers, sponsors, successors and assigns, each in their individual and business capacities.`,
      { caps: `To the fullest extent permitted by law, in no event will any of the Plate Parties be liable to you or any third party for any indirect, incidental, special, consequential, exemplary or punitive damages, or for any loss of profits, revenue, data, goodwill, use or business opportunity, or for any personal injury, illness, emotional distress, or property damage, arising out of or related to these Terms, the Service, any Place, any content, any Third-Party Service, any transaction, any unauthorized access to or use of our servers or any information stored on them, any interruption or cessation of the Service, any bugs, viruses or harmful code, any error or omission in any content, or the conduct of any member, Place or third party, whether based on warranty, contract, tort (including negligence), strict liability, statute or any other legal theory, and whether or not any Plate Party has been advised of the possibility of such damages.` },
      { caps: `To the fullest extent permitted by law, the total, aggregate liability of all Plate Parties for all claims arising out of or related to these Terms or the Service will not exceed the greater of (a) the total amount you paid to ${US} for the Service in the twelve (12) months before the event giving rise to the claim, or (b) fifty U.S. dollars (US $50).` },
      `These limitations apply even if a remedy fails of its essential purpose, and they are an essential part of the bargain between you and us: the Service is offered free of charge, and we would not offer it without them. Some jurisdictions do not allow the exclusion or limitation of certain damages; in those jurisdictions our liability is limited to the smallest amount the law allows. Nothing in these Terms limits liability that cannot be limited by law.`,
    ],
  },
  {
    id: "indemnity",
    title: "Indemnification",
    body: [
      `To the fullest extent permitted by law, you agree to defend, indemnify and hold harmless each of the Plate Parties from and against any and all claims, demands, actions, suits, proceedings, investigations, losses, liabilities, damages, judgments, settlements, fines, penalties, costs and expenses (including reasonable attorneys’ fees and costs) arising out of or related to: (a) your access to or use or misuse of the Service; (b) Your Content; (c) your violation of these Terms or of any law; (d) your violation of any right of any third party, including any intellectual property, privacy or publicity right; (e) your visit to, dealings with, or transactions with any Place or Third-Party Service; or (f) any person’s use of your account. We may, at your expense, assume the exclusive defense and control of any matter for which you must indemnify us, and you agree to cooperate with our defense. You may not settle any such matter without our prior written consent.`,
    ],
  },
  {
    id: "release",
    title: "Release",
    body: [
      `To the fullest extent permitted by law, you release, waive and forever discharge each of the Plate Parties from any and all claims, demands, damages and liabilities of every kind, known or unknown, arising out of or related to any dispute between you and any member, Place or other third party, and any content posted by others. If you are a California resident, you waive California Civil Code § 1542, which says: “A general release does not extend to claims that the creditor or releasing party does not know or suspect to exist in his or her favor at the time of executing the release and that, if known by him or her, would have materially affected his or her settlement with the debtor or released party.” You waive any similar law in any other jurisdiction.`,
    ],
  },
  {
    id: "security",
    title: "Security and your information",
    body: [
      `We use measures designed to protect information, including encrypted connections, access controls that limit each member to their own private data, and sign-in without passwords. However, no website, app, database or network is ever completely secure, and we cannot guarantee that unauthorized parties will never defeat our measures or misuse information. You agree that, to the fullest extent permitted by law, the Plate Parties are not liable for any unauthorized access to, use of, alteration of, disclosure of, or loss of information that occurs despite our reasonable efforts, including as a result of the acts of hackers, criminals, service providers, or other third parties. If we learn of a security breach involving your personal information, we will notify you as and when required by applicable law, including the Alabama Data Breach Notification Act of 2018.`,
      `You are responsible for the security of your own devices, networks and accounts, and for keeping a copy of anything you post.`,
    ],
  },
  {
    id: "disputes",
    title: "Dispute resolution: arbitration agreement and class action waiver",
    body: [
      { caps: `Please read this section carefully. It requires you and us to resolve most disputes through final, binding, individual arbitration instead of in court, and it waives your right to a jury trial and to participate in a class action. You may opt out within 30 days, as described below.` },
      { h: "Informal resolution first" },
      `Before starting any arbitration or court proceeding, you and we agree to try to resolve any dispute informally. The party with a claim must send the other a written notice describing the claim, the relief requested and the sender’s contact information (to us at ${LEGAL_EMAIL} and ${LEGAL_ADDRESS}; to you at the email address on your account), and the parties must make a good-faith effort, including an individual telephone or video conference if requested, to resolve it for at least sixty (60) days. Any statute of limitations is paused during this period.`,
      { h: "Agreement to arbitrate" },
      `Except as provided below, any dispute, claim or controversy between you and any of the Plate Parties arising out of or relating in any way to these Terms, the Service, Your Content, any Place, or your relationship with us, whether based on contract, tort, statute, fraud, misrepresentation or any other legal theory, and whether it arose before or after you agreed to these Terms (a “Dispute”), will be resolved exclusively by final and binding arbitration on an individual basis. The arbitrator, and not any court, has exclusive authority to resolve any question about the interpretation, applicability, enforceability or formation of this arbitration agreement, except that a court decides any question about the class action waiver, the mass-arbitration provisions, or whether a claim is subject to the small claims exception. This agreement is governed by the Federal Arbitration Act, 9 U.S.C. § 1 et seq.`,
      { h: "How arbitration works" },
      `Arbitration will be administered by the American Arbitration Association (“AAA”) under its Consumer Arbitration Rules then in effect, as modified by these Terms, before a single arbitrator. Unless the arbitrator finds that a hearing is necessary, arbitration of claims under $10,000 will be conducted solely on written submissions; any hearing will take place by video or in ${VENUE}, or another location we agree on. Payment of filing, administration and arbitrator fees is governed by the AAA rules; we will reimburse your share of those fees for claims under $10,000 unless the arbitrator finds your claim frivolous or brought for an improper purpose. The arbitrator may award any individual relief available in court, but only in favor of the individual party seeking relief and only to the extent necessary to provide relief warranted by that party’s individual claim. The arbitrator’s decision is final and binding, and judgment on it may be entered in any court of competent jurisdiction.`,
      { h: "Exceptions" },
      `Either party may (a) bring an individual claim in small claims court if it qualifies and remains there, and (b) seek injunctive or other equitable relief in court to stop actual or threatened infringement, misappropriation or violation of intellectual property rights, or misuse of the Service, including unauthorized access, scraping or hacking.`,
      { h: "Class action and jury trial waiver" },
      { caps: `You and we agree that each may bring claims against the other only in an individual capacity, and not as a plaintiff or class member in any purported class, collective, consolidated, representative or private attorney general proceeding. The arbitrator may not consolidate more than one person’s claims or preside over any form of class or representative proceeding. You and we each waive the right to a trial by jury.` },
      `If this class action waiver is found unenforceable as to any claim, that claim (and only that claim) must be severed and brought in court, and must be stayed until any individual arbitration is complete.`,
      { h: "Mass arbitration" },
      `If twenty-five (25) or more similar demands for arbitration are filed by or with the help of the same or coordinated counsel or organizations, they will be administered in batches of no more than fifty (50) demands, with one arbitrator per batch, and the remaining demands will be held in abeyance (with fees not assessed) until each batch is resolved. The parties agree to discuss in good faith a global resolution.`,
      { h: "Your right to opt out" },
      `You may opt out of this arbitration agreement by sending an email to ${LEGAL_EMAIL} with the subject line “Arbitration Opt-Out” within thirty (30) days after you first agree to these Terms, stating your name, the email address on your account, and that you opt out. Opting out does not affect any other part of these Terms. If you opt out, or if this arbitration agreement is found not to apply, Section 26 governs where disputes are resolved.`,
      { h: "Changes" },
      `If we make a material change to this section, you may reject it by emailing us within thirty (30) days of the change, in which case the version you last agreed to continues to apply.`,
    ],
  },
  {
    id: "law",
    title: "Governing law and venue",
    body: [
      `These Terms and any Dispute are governed by the laws of the State of ${GOVERNING_STATE} and applicable federal law, without regard to conflict-of-law rules, except that the Federal Arbitration Act governs Section 25. To the extent a Dispute is permitted to proceed in court, you and we consent to the exclusive jurisdiction of, and venue in, the state and federal courts located in ${VENUE}, and waive any objection based on inconvenient forum.`,
    ],
  },
  {
    id: "time-limit",
    title: "Time limit for claims",
    body: [
      { caps: `To the fullest extent permitted by law, any claim arising out of or related to these Terms or the Service must be filed within one (1) year after the claim arose; otherwise, the claim is permanently barred.` },
    ],
  },
  {
    id: "app-stores",
    title: "Mobile apps",
    body: [
      `If you download our app from the Apple App Store, you acknowledge that these Terms are between you and us only, not Apple; that Apple has no obligation to provide maintenance or support for the app; that Apple is not responsible for addressing any claims relating to the app (including product liability claims, claims that it fails to conform to legal or regulatory requirements, and consumer protection claims); that Apple is not responsible for any third-party claim that the app infringes intellectual property rights; and that Apple and its subsidiaries are third-party beneficiaries of these Terms with the right to enforce them against you. You represent that you are not located in a country subject to a U.S. government embargo and are not on any U.S. government list of prohibited or restricted parties.`,
    ],
  },
  {
    id: "general",
    title: "General terms",
    body: [
      `These Terms, together with the Privacy Policy and any other rules or policies posted on the Service and referenced in them, are the entire agreement between you and us about the Service and supersede any prior agreements. If any provision is found invalid or unenforceable, it will be enforced to the maximum extent permissible and the rest of these Terms will remain in full force. Our failure to enforce any right or provision is not a waiver of it. You may not assign or transfer these Terms or your account without our prior written consent; we may assign or transfer these Terms, in whole or in part, without restriction, including in connection with a merger, acquisition, sale of assets, or by operation of law.`,
      `We are not liable for any failure or delay in performance caused by events beyond our reasonable control, including acts of God, natural disasters, pandemics, war, terrorism, riots, labor disputes, government actions, utility or internet failures, cyberattacks, or failures of service providers. No agency, partnership, joint venture, employment or fiduciary relationship is created by these Terms. Headings are for convenience only and have no legal effect; “including” means “including without limitation.” These Terms are written in English, and any translation is for convenience only. There are no third-party beneficiaries of these Terms except the Plate Parties and as stated in Section 28.`,
      `Notices to us must be sent to ${LEGAL_EMAIL} and, for legal notices, also by mail to ${OPERATOR}, ${LEGAL_ADDRESS}. We may give notices to you by email, by posting on the Service, or through the app.`,
    ],
  },
  {
    id: "contact",
    title: "Contact",
    body: [
      `Questions about these Terms, a report that can’t wait, a copyright notice, an arbitration opt-out or any other legal notice: ${LEGAL_EMAIL}, or by mail to ${OPERATOR}, ${LEGAL_ADDRESS}.`,
    ],
  },
];

function Body({ b }: { b: Block }) {
  if (typeof b === "string") return <p>{b}</p>;
  if ("caps" in b) return <p className="legal-caps">{b.caps}</p>;
  if ("h" in b) return <h3>{b.h}</h3>;
  return (
    <ul className="privacy-list">
      {b.list.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

export default function Terms() {
  return (
    <main className="guide privacy legal">
      <header className="partners-top">
        <Link href="/" className="textbtn">
          ← Back
        </Link>
        <Link href="/" className="brand" aria-label={`${BRAND}, home`}>
          <Logo size={36} />
        </Link>
      </header>

      <p className="cap-kicker">Legal</p>
      <h1 className="guide-h1">Terms of Service</h1>
      <p className="guide-meta">
        Last updated {LEGAL_UPDATED} · Version {TERMS_VERSION}
      </p>
      <p className="guide-lede">
        These are the rules for using {BRAND}. The short version: be honest, be kind, post only what&apos;s yours, check with a restaurant before you go, and
        understand that the site is free and provided as-is. The full terms below are what count.
      </p>
      <div className="legal-alert">
        <b>Important:</b> these Terms include a binding arbitration agreement and a waiver of class actions and jury trials (Section 25), a disclaimer of
        warranties (Section 20), a limit on our liability (Section 21) and your agreement to indemnify us (Section 22). You can opt out of arbitration within
        30 days. Also see our <Link href="/privacy">Privacy Policy</Link>.
      </div>

      <nav className="legal-toc" aria-label="Contents">
        {SECTIONS.map((s, i) => (
          <div key={s.id}>
            <a href={`#${s.id}`}>
              {i + 1}. {s.title}
            </a>
          </div>
        ))}
      </nav>

      {SECTIONS.map((s, i) => (
        <section key={s.id} aria-labelledby={s.id}>
          <h2 className="menu-head" id={s.id}>
            <span>
              {i + 1}. {s.title}
            </span>
          </h2>
          {s.body.map((b, k) => (
            <Body key={k} b={b} />
          ))}
        </section>
      ))}

      <footer className="guide-foot">
        <Link href="/privacy">Privacy Policy</Link>
        <span> · </span>
        <Link href="/about">How we pick</Link>
        <span> · </span>
        <Link href="/">The map</Link>
      </footer>
    </main>
  );
}
