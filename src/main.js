import { createApp } from 'vue'
import App from './App.vue'

import { library } from '@fortawesome/fontawesome-svg-core'
import { 
  faArrowUp, 
  faArrowRight, 
  faArrowDown,
  faLightbulb, 
  faCamera, 
  faShuffle,
  faLock,
  faLockOpen,
  faDice
} from '@fortawesome/free-solid-svg-icons'

// Import the Font Awesome component
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

// Add the imported icons to the library
library.add(faArrowUp, faArrowRight, faArrowDown, faLightbulb, faCamera, faShuffle, faLock, faLockOpen, faDice)

const app = createApp(App)
app.component('font-awesome-icon', FontAwesomeIcon)
app.mount('#app')