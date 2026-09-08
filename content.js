/* =====================================================================
   content.js
   ===================================================================== */

window.SITE = {

  /* ---------- Header ---------- */
  name: `Ian W. McMurry`,
  tagline: `Data scientist and applied statistician. I develop statistical and machine-learning methods to measure real-world phenomena that conventional datasets miss.`,
  interests: [`Bayesian hierarchical modeling`, `Statistical machine learning`, `Representation learning`],
  bio: [
    `I'm completing an M.S. in Analytics at Georgia Tech on the Computational Data Analytics track. I'm especially interested in problems where the outcome people actually care about is not directly observed. My work uses statistical modeling, machine learning, and unconventional data to recover those signals and turn them into meaningful measures that can be tested, compared, and used. That has meant building a domain-specific transformer pipeline to quantify social atmosphere across 162,840 hostel reviews, published at WASSA 2026 (ACL), and estimating composition-adjusted rental yields from unpaired housing listings with a hierarchical Bayesian model.`,
    `Alongside the research I serve as an active-duty U.S. Marine Corps logistics officer in Okinawa, Japan, and consult as an analytics engineer for S10 Consulting, where I design data pipelines and LLM-assisted extraction workflows for recurring clients.`,
  ],
  headshot: { src: `assets/headshot.jpg`, alt: `Portrait of Ian W. McMurry`, caption: `Georgia Tech &middot; Okinawa, Japan` },
  links: [
    { label: `ian.mcmurry01@gmail.com`, href: `mailto:ian.mcmurry01@gmail.com` },
    { label: `LinkedIn`, href: `https://www.linkedin.com/in/ian-mcmurry` },
    { label: `GitHub`, href: `https://github.com/imcmurry` },
    { label: `ACL Anthology`, href: `https://doi.org/10.18653/v1/2026.wassa-1.3` },
  ],
  documents: [
    { label: `Academic CV`, href: `files/Ian_McMurry_CV.pdf`, primary: true },
    { label: `Data science resume`, href: `files/Ian_McMurry_Resume.pdf` },
  ],

  /* ---------- Research ---------- */
  research: {
    lede: `Statistics and machine learning applied to unconventional data.`,
    projects: [
      {
        eyebrow: [`NLP`, `Representation learning`, `2024 to present`],
        title: `Measuring social atmosphere in hostel reviews`,
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
        layout: `tall`,
        figure: {
          src: `assets/fig-yields.webp`,
          alt: `Dot plot of rental yield for 36 Armenian districts sorted from Jermuk at the top to Kentron at the bottom. Filled navy dots with 80% credible intervals show the model's posterior median yield; open orange circles show the raw median ratio; thin lines connect each pair, showing how far the raw figure moves once composition is adjusted.`,
          caption: `<strong>Raw ratio versus model, district by district.</strong> Open circles are the naive median rent-to-price yield; filled dots and bars are the posterior median and 80% credible interval for a standardized 60 m&sup2;, two-room apartment. The connecting lines show how far composition adjustment moves each district: Proshyan's raw 3.8% becomes 6.1%; Jermuk's 10.4% becomes 8.7%.`,
        },
        frame: `Where transaction registries are thin, online classifieds are the richest housing microdata available. But rent and sale listings describe different dwellings, so a naive median ratio moves whenever the housing mix moves, not only when the rent&ndash;price relationship does.`,
        paragraphs: [
          `I model rents and sale prices as separate log-linear hedonic surfaces whose district intercepts are drawn from a bivariate normal with a learned rent&ndash;sale correlation, so locations that are sparse on one side of the market borrow strength from the other. Dwelling characteristics absorb the composition differences that bias raw ratios, and the implied yield for a standardized apartment is recovered draw by draw from the posterior, returning a distribution rather than a point estimate. The model is fit in PyMC with NUTS to 8,863 listings across 36 Armenian districts and requires no matched-pair or registry data, which makes it transferable to other data-constrained markets.`,
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
        eyebrow: [`Applied analytics`, `Industry collaboration`, `2026`],
        title: `Beyond ratings: guest-experience analytics for Mad Monkey Hostels`,
        layout: `wide`,
        figure: {
          src: `assets/fig-madmonkey.webp`,
          alt: `Histogram of hostel socialness scores for 2,072 hostels worldwide, an exponential decay with mean 0.186, with 14 gold markers for the Mad Monkey properties included in the initial analysis placed between 0.39 (East Side) and 0.70 (Siargao), all far into the right tail. Annotation: 12 of 14 sit in the top roughly 10% of hostels worldwide.`,
          caption: `<strong>Where the analyzed properties sit in the world.</strong> The distribution of socialness scores across 2,072 hostels, with the 14 Mad Monkey properties represented in the initial research corpus marked. Twelve of the fourteen sit in the top roughly 10% of hostels worldwide, which is why the useful comparison is against same-city competitors rather than the global average.`,
        },
        frame: `What happens when one of Southeast Asia's leading hostel operators wants to manage guest experience using measures that did not exist a year ago.`,
        paragraphs: [
          `I developed the collaboration directly with Mad Monkey's leadership and am using the Georgia Tech Applied Analytics Practicum as the academic framework for a broader applied research project. Mad Monkey is a leading hostel operator in Southeast Asia and now spans 25+ destinations; the initial analysis covers the 14 properties represented in my research corpus. I am extending the published socialness pipeline into an operational guest-experience intelligence system: benchmarking each property against non-Mad-Monkey hostels in the same city (global comparisons reward geography, not management), controlling the false discovery rate across comparisons, and modeling how experience labels relate to guest ratings and review frequency using city and platform fixed effects with standard errors clustered by property. The analysis also separates high-quality social experience from "chaotic social" reviews, where strong social atmosphere appears alongside dirty or negative signals, turning an abstract experience measure into something management can diagnose and act on.`,
        ],
        links: [
          { label: `Report (PDF)`, href: `files/McMurry_2026_Mad_Monkey_Beyond_Ratings.pdf` },
        ],
        figures: [
          { value: `53.2`, unit: `% vs. 21.4%`, label: `share of Mad Monkey reviews classified social, against the market-wide rate` },
          { value: `14 of 14`, unit: ``, label: `properties show positive, statistically significant social lift over same-city competitors` },
          { value: `+0.30`, unit: ``, label: `points on a 10-point rating associated with a social review, after controls; a dirty review costs 0.97` },
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
      venue: `<strong>McMurry, I. W.</strong> Georgia Tech OMS Analytics Conference, October 8&ndash;9, 2026 (virtual). Accepted.`,
      links: [],
    },
    {
      year: `2026`,
      kind: `Industry report`,
      title: `Beyond Ratings: Measuring the Impact of Guest Experience in Hostel Reviews`,
      venue: `<strong>McMurry, I.</strong> Prepared for Mad Monkey Hostels, Georgia Institute of Technology.`,
      links: [
        { label: `PDF`, href: `files/McMurry_2026_Mad_Monkey_Beyond_Ratings.pdf` },
      ],
    },
  ],

  /* ---------- Experience (newest first) ---------- */
  experience: {
    intro: `I studied finance and information systems at Emory before commissioning as an officer in the U.S. Marine Corps. Since then, my work has developed along two parallel tracks: logistics and operations roles of increasing responsibility in the Marine Corps, and graduate study, research, and consulting in statistics, machine learning, and data engineering. Each has built a different part of how I work. The data side is where I developed the modeling and engineering; the Marine Corps is where I learned to lead people, make decisions under constraint, and plan and execute operations at a scale I would not otherwise have encountered this early.`,
    roles: [
      {
        when: `June 2025 to present`,
        place: `Remote`,
        current: true,
        title: `Analytics Engineer Consultant`,
        org: `S10 Consulting`,
        desc: `In parallel with the Marine Corps billets below. S10 is a frontier-markets data science firm; I designed the multi-stage ingestion and insight-generation platform that turns unstructured government procurement notices into structured, searchable data for 5+ recurring clients, built the LLM-assisted extraction workflows that produce 11 standardized attributes per solicitation through controlled API calls and reusable prompt templates, and architected the relational schemas that moved the recurring analysis from manual work into a product. The research above and the Georgia Tech degree ran on the same parallel track.`,
      },
      {
        when: `July 2023 to present`,
        place: `Okinawa, Japan, and the Republic of Korea`,
        current: true,
        title: `Logistics Officer`,
        org: `United States Marine Corps`,
        desc: `Three billets of increasing scope, newest first: operations planning, theater logistics liaison, platoon command.`,
        billets: [
          {
            when: `Mar. 2026 to present &middot; Okinawa`,
            title: `Current Operations Officer, S-3, Combat Logistics Regiment 35`,
            desc: `Lead action officer for a joint exercise of more than 1,600 personnel, synchronizing requirements with roughly 50 joint and service planners, and lead planner for two major regimental exercises. In the field I direct the regimental command node as senior watch officer for 150+ Marines and Sailors.`,
          },
          {
            when: `Aug. 2025 to Mar. 2026 &middot; Republic of Korea`,
            title: `Officer in Charge, Logistics Liaison Detachment`,
            desc: `Led III MEF's only Korea-based logistics detachment: the point of contact for the logistics needs of every Marine unit arriving on the peninsula to train, across 18+ units and four major exercises, with a combined &#8361;6.8 billion (about $4.2M) support budget. As the theater subject-matter expert, I represented III MEF's requirements across four joint planning cycles and briefed 100+ lead planners.`,
          },
          {
            when: `2024 to 2025 &middot; Okinawa`,
            title: `Platoon Commander, 3d Supply Battalion`,
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
      school: `Georgia Institute of Technology`,
      degree: `M.S. in Analytics, Computational Data Analytics track`,
      meta: `Aug. 2024 to Dec. 2026 (expected) &middot; GPA 4.00 / 4.00`,
      courses: `Bayesian Statistics, Statistical Modeling and Regression Analysis, Computational Data Analysis, Simulation and Modeling for Engineering and Science, Applied Natural Language Processing.`,
    },
    {
      school: `Emory University`,
      degree: `B.B.A. in Finance and Information Systems`,
      meta: `Aug. 2019 to May 2023 &middot; GPA 3.77 / 4.00`,
      courses: ``,
    },
  ],

  skills: [
    { group: `Statistics and modeling`, items: `Bayesian hierarchical models, PyMC and NUTS/MCMC, posterior predictive checking, regression with fixed effects and clustered errors, multiple-comparison control, simulation.` },
    { group: `Machine learning and NLP`, items: `Transformer fine-tuning (cross-encoders, sentence-transformers), pseudo-labeling and distillation, representation learning, embedding-space evaluation, LLM-assisted extraction with controlled prompts.` },
    { group: `Engineering`, items: `Python, SQL, relational schema design, data pipelines, API integration, KPI dashboards, Google Cloud Translation.` },
    { group: `Languages`, items: `English (native), Portuguese and Spanish (functional).` },
  ],

  /* ---------- Background ---------- */
  background: [
    `I'm American, but I grew up in Luxembourg, and that international upbringing still shapes the questions I gravitate toward. Much of my research begins with something I encounter while moving through different places and then realize can be turned into a statistical problem. The hostel work grew out of years of hostel travel and the observation that the social atmosphere travelers cared about most was the one attribute no booking platform measured directly. The housing work grew from an interest in frontier markets, Armenia in particular, where careful statistics on messy public data can recover useful market structure when conventional records are thin or unavailable.`,
    `The Marine Corps gave me something the coursework couldn't. About a year in, I was leading a platoon of Marines and responsible for $29M in supply accounts; by my second year I was the logistics liaison for every Marine unit training in Korea; by my third I was planning exercises for more than 1,600 people. That level of leadership and operational responsibility is hard to find in civilian roles at my stage, and it sits alongside the modeling as part of what I bring: ownership of outcomes, plans built with the people who have to execute them, and the ability to run an operation, not only design one.`,
  ],

  /* ---------- Contact ---------- */
  contact: {
    text: `My active-duty commitment ends in summer 2027. If you're working on Bayesian measurement, representation learning, or applied statistics in data-constrained settings, I'd like to hear from you.`,
    ways: [
      { key: `Email`, html: `<a href="mailto:ian.mcmurry01@gmail.com">ian.mcmurry01@gmail.com</a> &middot; <a href="mailto:imcmurry3@gatech.edu">imcmurry3@gatech.edu</a>` },
      { key: `LinkedIn`, html: `<a href="https://www.linkedin.com/in/ian-mcmurry">linkedin.com/in/ian-mcmurry</a>` },
      { key: `GitHub`, html: `<a href="https://github.com/imcmurry">github.com/imcmurry</a>` },
      { key: `Documents`, html: `<a href="files/Ian_McMurry_CV.pdf">Academic CV</a> &middot; <a href="files/Ian_McMurry_Resume.pdf">Data science resume</a>` },
    ],
  },

  /* ---------- Footer ---------- */
  footer: { left: `&copy; 2026 Ian W. McMurry`, right: `Last updated September 2026` },
};