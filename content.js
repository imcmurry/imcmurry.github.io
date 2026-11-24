/* =====================================================================
   content.js
   ===================================================================== */

window.SITE = {

  /* ---------- Header ---------- */
  name: `Ian W. McMurry`,
  tagline: `Data scientist and applied statistician. I develop statistical and machine-learning methods to measure real-world phenomena that conventional datasets miss.`,
  interests: [`Bayesian hierarchical modeling`, `Statistical machine learning`, `Representation learning`],
  bio: [
    `I'm an applied statistician interested in understanding phenomena that matter but are difficult to observe directly. My research sits at the intersection of statistical inference, machine learning, and unconventional data. I'm particularly interested in developing methods that leverage rich but imperfect sources of information to better understand complex phenomena, especially in communities and industries underserved by conventional data sources. This has led me to explore a range of topics from quantifying social atmosphere through 162,840 hostel reviews to using unconventional data to estimate rental yields in housing markets in developing countries.`,
    `I'm currently completing an M.S. in Analytics at Georgia Tech and will begin a PhD in Statistics at Trinity College Dublin in September 2027, where I plan to develop Bayesian statistical methods for drawing reliable conclusions from imperfect machine learning measurements, particularly those derived from text.`,
    `Alongside my research, I work as an analytics engineer for S10 Consulting, designing data pipelines and LLM-assisted extraction workflows, and serve as an active-duty Marine Corps logistics officer based in Okinawa, Japan.`,
  ],
  headshot: { src: `assets/headshot.jpg`, alt: `Portrait of Ian W. McMurry`, caption: `Georgia Tech &middot; Okinawa, Japan` },
  links: [
    { label: `ian.mcmurry01@gmail.com`, href: `mailto:ian.mcmurry01@gmail.com` },
    { label: `LinkedIn`, href: `https://www.linkedin.com/in/ian-mcmurry` },
    { label: `ACL Anthology`, href: `https://doi.org/10.18653/v1/2026.wassa-1.3` },
  ],
  documents: [
    { label: `2-page CV`, href: `files/Ian_McMurry_CV.pdf`, primary: true },
    { label: `1-page Résumé`, href: `files/Ian_McMurry_Resume.pdf` },
  ],

  /* ---------- Research ---------- */
  research: {
    projects: [
      {
        eyebrow: [`NLP`, `Representation learning`, `2024 to present`],
        title: `Measuring social atmosphere in hostel reviews`,
        demo: `hostel-social`,
        layout: `wide`,
        figure: {
          src: `assets/fig-umap.webp`,
          alt: `Two UMAP scatter plots of 4,994 labeled hostel reviews. Left: generic MiniLM embeddings, where social and non-social reviews overlap heavily. Right: fine-tuned bi-encoder embeddings, where social reviews form a distinct cluster separated from non-social reviews.`,
          caption: `<strong>The whole result in one picture.</strong> UMAP projection of the 4,994 human-labeled reviews, <span class="sw gold"></span> social and <span class="sw navy"></span> non-social. With generic sentence embeddings (left) the two classes are mixed; after distilling the cross-encoder's judgments into a domain-adapted bi-encoder (right), socialness becomes a direction in the space. The intra-class versus inter-class similarity gap grows from 0.018 to 0.704.`,
        },
        frame: `More than half of solo travelers say meeting people was the most memorable part of their trip, yet no booking platform can say whether a hostel is actually social. Platform "atmosphere" ratings measure whether expectations were met, not the attribute itself.`,
        paragraphs: [
          `I formalized <em>socialness</em> as a measurable construct, hand-labeled 4,994 reviews under a written rubric, trained a cross-encoder to pseudo-label a corpus of 162,840 reviews spanning 2,230 hostels in 72 cities, and distilled its judgments into a domain-adapted sentence-transformer whose geometry reflects guest-to-guest interaction rather than sentiment or topic. Every reported number is computed on held-out human labels; the fine-tuned model beats both generic embeddings and a zero-shot LLM, which misses the implicit cases the rubric was built to catch. Aggregated to the property level, hostel socialness follows an approximately exponential decay: highly social hostels are rare.`,
          `I'm now extending the pipeline to further experience signals (cleanliness, calmness, sentiment) and developing a hierarchical Bayesian latent-variable model over the review embeddings.`,
        ],
        links: [
          { label: `Paper (WASSA 2026, ACL)`, href: `https://doi.org/10.18653/v1/2026.wassa-1.3` },
          { label: `PDF`, href: `files/McMurry_2026_WASSA_Hostel_Socialness.pdf` },
          { label: `Conference talk, Oct. 2026`, href: `#publications` },
        ],
        figures: [
          { value: `0.826`, unit: `F1`, label: `on held-out human labels, vs. 0.671 for generic embeddings and 0.774 for zero-shot GPT-4o-mini` },
          { value: `40&times;`, unit: ``, label: `wider gap between intra-class and inter-class cosine similarity after fine-tuning` },
          { value: `162,840`, unit: ``, label: `reviews across 2,230 hostels and 72 cities, in 20+ languages` },
        ],
      },
      {
        eyebrow: [`Bayesian hierarchical modeling`, `Housing economics`, `2026`],
        title: `Rental yields from unpaired online housing listings`,
        demo: `armenia-yields`,
        layout: `wide`,
        figure: {
          src: `assets/fig-yields.webp`,
          alt: `Dot plot of rental yield for 36 Armenian districts sorted from Jermuk at the top to Kentron at the bottom. Filled navy dots with 80% credible intervals show the model's posterior median yield; open orange circles show the raw median ratio; thin lines connect each pair, showing how far the raw figure moves once composition is adjusted.`,
          caption: `<strong>Raw ratio versus model, district by district.</strong> Open circles are the naive median rent-to-price yield; filled dots and bars are the posterior median and 80% credible interval for a standardized 60 m&sup2;, two-room apartment. The connecting lines show how far composition adjustment moves each district: Proshyan's raw 3.8% becomes 6.1%; Jermuk's 10.4% becomes 8.7%.`,
        },
        frame: `Where transaction registries are thin, online classifieds are the richest housing microdata available. But rent and sale listings describe different dwellings, so a naive median ratio moves whenever the housing mix moves, not only when the rent&ndash;price relationship does.`,
        paragraphs: [
          `I model rents and sale prices as separate log-linear hedonic surfaces whose district intercepts are drawn from a bivariate normal with a learned rent&ndash;sale correlation, so locations that are sparse on one side of the market borrow strength from the other. Dwelling characteristics absorb the composition differences that bias raw ratios, and the implied yield for a standardized apartment is recovered draw by draw from the posterior, returning a distribution rather than a point estimate. The model is fit in PyMC with NUTS to 8,863 listings across 36 Armenian districts and requires no matched-pair or registry data, which makes it transferable to other data-constrained markets. The result is a district-level yield measure that is comparable across places rather than driven by which types of homes happen to be listed.`,
        ],
        links: [
          { label: `Working paper (PDF)`, href: `files/McMurry_2026_Rental_Yields_Armenia.pdf` },
        ],
        figures: [
          { value: `91.3`, unit: `% / 90.9%`, label: `empirical coverage of nominal 90% posterior predictive intervals for rent and sale prices, with zero divergent transitions` },
          { value: `&rho; = 0.987`, unit: ``, label: `learned rent&ndash;sale correlation across districts: expensive-to-rent places are expensive to buy` },
          { value: `5.4 to 8.7`, unit: `%`, label: `estimated gross yields, from Kentron to Jermuk, materially different from naive median ratios` },
        ],
      },
      {
        eyebrow: [`Applied machine learning`, `Industry research partnership`, `2026`],
        title: `Beyond ratings: building Guest Experience Intelligence for Mad Monkey Hostels`,
        layout: `wide`,
        figure: {
          src: `assets/fig-madmonkey.webp`,
          alt: `Histogram of hostel socialness scores for 2,072 hostels worldwide, an exponential decay with mean 0.186, with 14 gold markers for the Mad Monkey properties included in the initial analysis placed between 0.39 (East Side) and 0.70 (Siargao), all far into the right tail. Annotation: 12 of 14 sit in the top roughly 10% of hostels worldwide.`,
          caption: `<strong>Where the analyzed properties sit in the world.</strong> The distribution of socialness scores across 2,072 hostels, with the 14 Mad Monkey properties represented in the initial research corpus marked. Twelve of the fourteen sit in the top roughly 10% of hostels worldwide, which is why the useful comparison is against same-city competitors rather than the global average.`,
        },
        frame: `What happens when one of Southeast Asia's leading hostel operators wants to manage guest experience using measures that did not exist a year ago.`,
        paragraphs: [
          `I am working directly with the COO and CTO of Mad Monkey Hostels, one of Asia's largest hostel operators, in an applied research partnership bringing my published machine-learning research into operational use across 22 properties in Southeast Asia.`,
          `The project combines machine-learning-derived guest-experience measures with internal operational data to investigate how guest experiences, property characteristics, and management initiatives relate to commercial performance. My research spans validating new measures against conventional ratings and observed guest behavior, developing longitudinal statistical models to disentangle relationships across and within properties, and evaluating the outcomes of network-wide operational initiatives. Among the findings, social atmosphere emerges as a relatively stable property characteristic associated with guest engagement, while commercial performance depends on a broader combination of operational and contextual factors. These insights inform cross-validated predictive models and context-adjusted benchmarks that identify properties performing above or below expectations, helping management prioritize opportunities for further investigation and improvement.`,
        ],
        links: [],
        figures: [
          { value: `53.2`, unit: `% vs. 21.4%`, label: `share of Mad Monkey reviews classified social, against the market-wide rate` },
          { value: `14 of 14`, unit: ``, label: `properties show positive, statistically significant social lift over same-city competitors` },
          { value: `+0.30`, unit: ``, label: `points on a 10-point rating associated with a social review, after controls.` },
        ],
      },
    ],
  },

  /* ---------- Publications & talks ---------- */
  publications: [
    {
      year: `2026`,
      kind: `Peer-reviewed paper`,
      title: `Quantifying Social Sentiment in Hostels Using a Domain-Specific Transformer Pipeline`,
      venue: `<strong>McMurry, I. W.</strong> In <em>Proceedings of the 15th Workshop on Computational Approaches to Subjectivity, Sentiment &amp; Social Media Analysis (WASSA 2026)</em>, Association for Computational Linguistics, pp. 24&ndash;36.`,
      links: [
        { label: `DOI 10.18653/v1/2026.wassa-1.3`, href: `https://doi.org/10.18653/v1/2026.wassa-1.3` },
        { label: `PDF`, href: `files/McMurry_2026_WASSA_Hostel_Socialness.pdf` },
      ],
    },
    {
      year: `2026`,
      kind: `Working paper`,
      title: `Estimating Rental Yields from Unpaired Online Housing Listings: A Hierarchical Bayesian Approach with Evidence from Armenia`,
      venue: `<strong>McMurry, I.</strong> Georgia Institute of Technology, August 2026.`,
      links: [
        { label: `PDF`, href: `files/McMurry_2026_Rental_Yields_Armenia.pdf` },
      ],
    },
    {
      year: `2026`,
      kind: `Conference presentation`,
      title: `Beyond the Star Rating: Teaching a Transformer to Read the Social Atmosphere in 162,000 Hostel Reviews`,
      venue: `<strong>McMurry, I. W.</strong> Presented October 8, 2026, at the Georgia Tech OMS Analytics Conference (virtual).`,
      links: [],
    },
  ],

  /* ---------- Experience (newest first) ---------- */
  experience: {
    intro: [
    `After studying finance and information systems at Emory University, my professional experience developed along two parallel tracks: logistics and operations roles of increasing responsibility in the U.S. Marine Corps, and graduate study, research, and consulting in statistics, machine learning, and data science.`,
    `Each has built a different part of how I work. The data side is where I learned to turn ambiguous questions into measurable problems, develop statistical and machine learning models, and build the engineering needed to make them work at scale. The Marine Corps is where I learned to lead people, make decisions under constraint, and plan and execute complex operations. Working across Japan and South Korea has further developed my ability to operate across cultures, coordinate diverse teams, and translate plans into outcomes.`,
    ],
    roles: [
      {
        when: `June 2025 to present`,
        place: `Remote`,
        current: true,
        title: `Analytics Engineer Consultant`,
        org: `S10 Consulting`,
        desc: `I work with S10 in parallel with my Marine Corps service. S10 is a defense and government contracting consultancy. I designed the multi-stage ingestion and insight-generation platform that turns unstructured government procurement notices into structured, searchable data for 5+ recurring clients. I also built LLM-assisted extraction workflows that produce 11 standardized attributes per solicitation through controlled API calls and reusable prompt templates, and architected the relational schemas that moved recurring analysis from manual work into a product.`,
      },
      {
        when: `July 2023 to present`,
        place: `Okinawa, Japan, and the Republic of Korea`,
        current: true,
        title: `Supply & Logistics Officer`,
        org: `United States Marine Corps`,
        desc: `Three billets of increasing scope: platoon command, theater logistics liaison and operations planning.`,
        billets: [
          {
            when: `Mar. 2026 to present &middot; Okinawa`,
            title: `Current/Future Operations Officer, S-3`,
            desc: `Lead action officer for a joint exercise of more than 1,600 personnel, synchronizing requirements with roughly 50 joint and service planners, and lead planner for two major regimental exercises. In the field I direct the regimental command node as senior watch officer for 150+ Marines and Sailors.`,
          },
          {
            when: `Aug. 2025 to Mar. 2026 &middot; Republic of Korea`,
            title: `Officer in Charge, Logistics Liaison Detachment`,
            desc: `Led III MEF's only Korea-based logistics detachment: the point of contact for the logistics needs of every Marine unit arriving on the peninsula to train, across 18+ units and four major exercises, with a combined &#8361;6.8 billion (about $4.2M) support budget. As the theater subject-matter expert, I represented III MEF's requirements across four joint planning cycles and briefed 100+ lead planners.`,
          },
          {
            when: `2024 to 2025 &middot; Okinawa`,
            title: `Platoon Commander`,
            desc: `Led a platoon of 19 Marines, with the full scope that implies: training, evaluations, discipline, and welfare. Responsible for three supply accounts worth $29M that issued 4,000+ transactions valued at over $100M to 35 units across III Marine Expeditionary Force; raised 30-day documentation accountability from 60% to 92%, increased special-project parts shipped by 71%, and led the transfer of all three accounts to Marine Corps Logistics Command.`,
          },
        ],
      },
      {
        when: `Jan. to May 2023`,
        place: `Atlanta, GA`,
        title: `Teaching Assistant, Business Analytics`,
        org: `Emory University`,
        desc: `Supported a 250+ student Business Analytics course covering regression, advanced Excel, macros, and scenario analysis. I held weekly office hours, graded analytical assignments, and helped students work through quantitative methods and model-building problems one-on-one.`,
      },
      {
        when: `Nov. 2022 to Nov. 2023`,
        place: `Remote`,
        title: `Operations Data Analyst`,
        org: `TOCA Football`,
        desc: `TOCA operates soccer training centers across the United States. I analyzed more than $1.3M in sales across 14 locations to quantify revenue lost to discounts, built KPI dashboards for 240+ trainers, and automated recurring reporting with Python and SQL-backed Google Sheets workflows, saving the operations team 15+ hours a week.`,
      },
    ],
  },

  /* ---------- Education & skills ---------- */
  education: [
    {
      school: `Trinity College Dublin`,
      logo: `assets/edu-trinity.webp`,
      degree: `PhD in Statistics`,
      meta: `Incoming, September 2027`,
      courses: ``,
    },
    {
      school: `Georgia Institute of Technology`,
      logo: `assets/edu-georgia-tech.webp`,
      degree: `M.S. in Analytics, Computational Data Analytics track`,
      meta: `Aug. 2024 to Dec. 2026 (expected) &middot; GPA 4.00 / 4.00`,
      courses: `Bayesian Statistics, Statistical Modeling and Regression Analysis, Computational Data Analysis, Simulation and Modeling for Engineering and Science, Applied Natural Language Processing.`,
    },
    {
      school: `Emory University`,
      logo: `assets/edu-emory.webp`,
      degree: `B.B.A. in Finance and Information Systems`,
      meta: `Aug. 2019 to May 2023 &middot; GPA 3.77 / 4.00`,
      courses: ``,
    },
    {
      school: `Honors & recognition`,
      degree: `<strong>Navy and Marine Corps Achievement Medal</strong> (2026)<br>Recognized for meritorious achievement and significant impact beyond the expectations of grade and billet while serving as Officer in Charge, Korea Logistics Liaison Detachment.<br><br><strong>Dean's List, Emory University</strong> (Fall 2022; Spring 2023).`,
      meta: ``,
      courses: ``,
    },
  ],

  skills: [
    { group: `Statistics and modeling`, items: `Bayesian hierarchical models, PyMC and NUTS/MCMC, posterior predictive checking, regression with fixed effects and clustered errors, multiple-comparison control, simulation.` },
    { group: `Machine learning and NLP`, items: `Transformer fine-tuning (cross-encoders, sentence-transformers), pseudo-labeling and distillation, representation learning, embedding-space evaluation, LLM-assisted extraction with controlled prompts.` },
    { group: `Engineering`, items: `Python, SQL, relational schema design, data pipelines, API integration, KPI dashboards, Google Cloud Translation.` },
    { group: `Languages`, items: `English (native), Portuguese and Spanish (conversational).` },
  ],

  /* ---------- Background ---------- */
  background: [
    `I grew up in Luxembourg, where I attended the International School of Luxembourg alongside people from a wide range of cultural backgrounds. Since moving from Luxembourg, I've lived in the United States for my undergraduate studies, Japan and Korea for work, and soon back to Europe to pursue my doctoral studies in Ireland. Having spent much of my life abroad, I have developed a deep appreciation for different cultures, perspectives, and ways of life.`,
    `Outside of my academic and professional pursuits, my greatest passion is travel. Over the years, I've spent much of my free time independently backpacking around the world. I'm particularly drawn to unfamiliar places, the people I meet along the way, and the social and cultural nuances that give each place its distinct identity.`,
    `That same curiosity has naturally extended into my research. What started as a naïve quest to find the most social hostel during my solo backpacking trips evolved into a much broader curiosity about understanding human behavior and social phenomena through messy and overlooked data. Whether it was the vibrant hostel scene in Brazil, the Soviet-era apartment blocks of Armenia, or the sprawling Tokyo Metro system, I kept finding myself asking questions about the things I encountered and wondering how statistical methods could help answer them.`,
    `Often, the clues were hiding in plain sight. Online reviews, property listings, and digital maps contain extraordinary amounts of information about the world around us, yet much of it remains underutilized because it doesn't fit neatly into conventional datasets. I'm particularly drawn to questions and settings where traditional data sources fall short, and to developing statistical methods that can better accommodate the richness, complexity, and uncertainty of unconventional data.`,
    `Somewhere along the way, the line between exploring the world and researching it began to disappear.`,
  ],

  /* ---------- Contact ---------- */
  contact: {
    text: `My active-duty military commitment ends in summer 2027. If you're working on Bayesian measurement, representation learning, or applied statistics in data-constrained settings, I'd like to hear from you.`,
    ways: [
      { key: `Email`, html: `<a href="mailto:ian.mcmurry01@gmail.com">ian.mcmurry01@gmail.com</a> &middot; <a href="mailto:imcmurry3@gatech.edu">imcmurry3@gatech.edu</a>` },
      { key: `LinkedIn`, html: `<a href="https://www.linkedin.com/in/ian-mcmurry">linkedin.com/in/ian-mcmurry</a>` },
      { key: `Documents`, html: `<a href="files/Ian_McMurry_CV.pdf">2-page CV</a> &middot; <a href="files/Ian_McMurry_Resume.pdf">1-page Résumé</a>` },
    ],
  },

  /* ---------- Footer ---------- */
  footer: { left: `&copy; 2026 Ian W. McMurry`, right: `Last updated November 2026` },
};
