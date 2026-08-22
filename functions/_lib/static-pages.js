// functions/_lib/static-pages.js
// Content for the small set of static informational pages. Edit the text
// here and push — these aren't managed through the admin panel.

export const STATIC_PAGES = {
  about: {
    path: "/about",
    title: "हमारे बारे में",
    description: "सजग भारत के बारे में जानें — हमारा उद्देश्य और संपादकीय दृष्टिकोण।",
    bodyHtml: `
      <p>सजग भारत एक हिंदी समाचार पोर्टल है, जिसका उद्देश्य पाठकों तक देश-दुनिया की ख़बरें सरल, स्पष्ट और समय पर पहुँचाना है।</p>
      <p>हम राष्ट्रीय-अंतरराष्ट्रीय घटनाओं, तकनीक, शिक्षा, मनोरंजन, खेल, व्यापार और स्वास्थ्य से जुड़ी ख़बरों को कवर करते हैं।</p>
      <p><em>यह एक नमूना पृष्ठ है — कृपया वास्तविक जानकारी जोड़ें (functions/_lib/static-pages.js में)।</em></p>`
  },
  contact: {
    path: "/contact",
    title: "संपर्क करें",
    description: "सजग भारत टीम से संपर्क करने के लिए जानकारी।",
    bodyHtml: `
      <p>किसी भी सुझाव, शिकायत या समाचार सूचना के लिए हमसे संपर्क करें:</p>
      <p>ईमेल: <a href="mailto:contact@sajagbharat.example">contact@sajagbharat.example</a></p>
      <p><em>यह एक नमूना पृष्ठ है — कृपया वास्तविक संपर्क जानकारी जोड़ें।</em></p>`
  },
  "privacy-policy": {
    path: "/privacy-policy",
    title: "गोपनीयता नीति",
    description: "सजग भारत की गोपनीयता नीति।",
    bodyHtml: `
      <p>यह गोपनीयता नीति बताती है कि सजग भारत आपकी जानकारी का उपयोग कैसे करता है।</p>
      <p><em>यह एक नमूना पृष्ठ है — कृपया अपनी वास्तविक गोपनीयता नीति यहाँ जोड़ें (डेटा संग्रहण, कुकीज़, विज्ञापन आदि से जुड़े विवरण सहित)।</em></p>`
  },
  disclaimer: {
    path: "/disclaimer",
    title: "अस्वीकरण",
    description: "सजग भारत का अस्वीकरण।",
    bodyHtml: `
      <p>इस वेबसाइट पर प्रकाशित सामग्री केवल सामान्य जानकारी के उद्देश्य से है।</p>
      <p><em>यह एक नमूना पृष्ठ है — कृपया अपना वास्तविक अस्वीकरण यहाँ जोड़ें।</em></p>`
  }
};
