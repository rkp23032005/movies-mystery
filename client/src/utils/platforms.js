// Same normalisation as server/utils/platforms.js, so "Prime Video", "Amazon Prime Video",
// "Disney+", "Disney Plus", "Disney Plus Hotstar" etc. all resolve to one platform.
const ALIASES = {
  amazonprime: 'primevideo', amazonprimevideo: 'primevideo',
  hbomax: 'max',
  disneyhotstar: 'hotstar', disneyplushotstar: 'hotstar', jiohotstar: 'hotstar',
  appletvplus: 'appletv',
};

export function platformKey(name = '') {
  const k = String(name).toLowerCase().replace(/\+/g, 'plus').replace(/[^a-z0-9]/g, '');
  return ALIASES[k] || k;
}

export const PLATFORM_COLORS = {
  netflix:       'bg-red-900/70 text-red-300',
  primevideo:    'bg-blue-900/70 text-blue-300',
  disneyplus:    'bg-blue-950/80 text-blue-200',
  hotstar:       'bg-purple-900/70 text-purple-300',
  appletv:       'bg-gray-700 text-gray-200',
  max:           'bg-indigo-900/70 text-indigo-300',
  hulu:          'bg-green-900/70 text-green-300',
  paramountplus: 'bg-sky-900/70 text-sky-300',
  zee5:          'bg-violet-900/70 text-violet-300',
  sonyliv:       'bg-yellow-900/70 text-yellow-300',
  jiocinema:     'bg-indigo-900/70 text-indigo-300',
};

export const PLATFORM_LINKS = {
  netflix:       'https://www.netflix.com',
  primevideo:    'https://www.primevideo.com',
  disneyplus:    'https://www.disneyplus.com',
  hotstar:       'https://www.hotstar.com',
  appletv:       'https://tv.apple.com',
  max:           'https://www.max.com',
  hulu:          'https://www.hulu.com',
  paramountplus: 'https://www.paramountplus.com',
  zee5:          'https://www.zee5.com',
  sonyliv:       'https://www.sonyliv.com',
  jiocinema:     'https://www.jiocinema.com',
};
