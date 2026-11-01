// A clearly labelled sample order, shown only in the preview build so the
// Studio can be tried without a server. Its date is always a few weeks ahead.
// The picture was made by building this exact order in the current builder.

function upcomingSaturday(weeksAhead) {
  const d = new Date();
  d.setDate(d.getDate() + weeksAhead * 7);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

import { getUkTaxYear } from './catalogData.js';

export function buildDemoOrders() {
  const ref = n => `ID_${getUkTaxYear().slash}_${n}`;
  return [
    {
      id: ref(1001),
      createdAt: new Date().toISOString(),
      status: 'New Enquiry',
      seenByAdmin: false,
      client: {
        name: 'Demo Customer',
        email: 'demo@example.com',
        phone: '07700 900000',
        eventDate: upcomingSaturday(3),
        postcode: 'NG13 0AA',
        venueName: 'The Village Hall',
        accessTime: '10:00',
        setting: 'indoor',
        notes: 'This is a demo order to show how the Studio works.'
      },
      configuration: {
        "palette": [
          "Organic Sage",
          "Pearl Ivory",
          "Chrome Gold",
          "Warm Taupe",
          "Soft Blush"
        ],
        "backdrop": "Personalised Wooden Arch Board",
        "balloonLayout": "7ft Organic Garland (Up One Side)",
        "digitsOrLetters": "Helium Foil Numbers + 2 Clusters (\"40\")",
        "extras": [
          "Neon Sign (\u00a335)"
        ],
        "promoCode": "",
        "subtotal": 242.0,
        "bundleDiscount": 0,
        "estimatedTotal": 242.0,
        "balloonPullList": "25 \u00d7 101_M (Organic Sage), 25 \u00d7 102_M (Pearl Ivory), 25 \u00d7 103_M (Chrome Gold), 25 \u00d7 104_M (Warm Taupe), 25 \u00d7 105_M (Soft Blush)",
        "backdropId": "wooden-board",
        "balloonId": "garland-7ft",
        "digitId": "helium-foil-numbers",
        "digitText": "40",
        "extraIds": [
          "neon-sign"
        ],
        "shimmerSize": "N/A",
        "boardCustomization": {
          "color": "#F5EFEB",
          "colorName": "Warm Ivory",
          "text": "Happy 40th Jo",
          "vinylColor": "gold"
        },
        "neonPhrase": "Happy Birthday",
        "bubbleText": "",
        "depositPaid": 0,
        "balanceDue": 242.0
      },
      previewSnapshotDataUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCAFoAWgDASIAAhEBAxEB/8QAGwABAQACAwEAAAAAAAAAAAAAAAEEBQIDBgf/xABIEAABAwIDBAcFBQcABwkAAAABAAIDBBEFEiEGEzFBFCIyUWFxkVOBobHBB0JScuEVIzNistHwJCc0VIKDoxZDc3SSosLi8f/EABkBAQEBAQEBAAAAAAAAAAAAAAABAgMEBf/EACwRAQEAAgICAQMEAQMFAAAAAAABAhEDIRIxBCJBURMUMmHwBUKhcYGRsdH/2gAMAwEAAhEDEQA/APqqqIuLYqiICqIqCKogIiqIiqIgIiqCKoiAiqIIiqIIiqIIiqIIiqIIiqIIiqiCIqiCIiIIiqIIoqiKiKqIIiqigiKqIIiIgqqIgKoioKoiAiKogiKoIqiICKogIiqoiKogIiICKogiKogiKqICiqIIiqIIoqigiKqIIiqIIoqiCIiIqIqogiKqKCIqiAqiKgqoqgIiqIIiqAiKoCIioKoiAiqICIqgiKogIiICIiAoqiCIqiCKKogiKqIIiqIIoqigiiqIIoqiCIiIqIiIIiqKAiKqgiKogiKoCIqgIiqoIiqCKoqgiqKoIqiICIiAiqIIiqIIiqiAiIgiKog4oqiCKKogiiqIIoqigiiqIIoqiCKKoioiIgKoiAqiIgqiICqIgqIioqIqgIiqAiKoIqiICKogiKogiKogiKogiKqIIiqIIoqiCKKogiiqiAoqogiKqKCIqogiKqIqIqiAiIgqIqiCqiqAqoqqCqIgqIqgIiIKiKoIqiICqIgIixsRpm1VK6OSomgjBDnvhkMbrDXtDUDyVGSi8VAyviw/BZxW1hgr6lrZBJO4vZE9zpGDMTcGwYwnjqVvtlamepwyXpLnPMNZUwMkcbl7GTPa0k8zYAX52ug26IiCIqooIiqiAoqiCKKogiiqiCIqogiiqKCKKogiiqIIiIiiqiqIKqKoCqiqCoiKiqqKoCqiqAqiICqJdAVXW6VjO29rfM2XJrwRcEEd4QckvZcXPAFydAsKatO7c+FuZjRrI7Rv6+5NrrbOLgFwlEc0T4pWtfG9pa5rhcOB4grRF1RUgule634WGwH91jOYYXCRoDrfcfqCs+Tr+hde3o5o6eeHcTRRSRafu3tBbpw09wXZCyOGNscLGxxtFmtYAAB4BeZm2hwaABvRTI63WEcTTlPdc2WfhVbhWKh3RAWSN7Udyxw8bAq7cet6bq6LG6PIzWGod+WTrD+6nSHw6VLMg/G3Vv6e9Xa6ZSLi1wIBB0K5KoiKqKCIqogiIiCIl1LoCiqiAol0ugiIigiIiCIiIoqoqiCqiqCoiKioiqAqoqgqIiCoiIBNl5za/Hn4TSsipQHVc5yx3+74rfvdZeL20wXFaurhrqSmdKyAXLWkZreA5rHJcpj9LWGt9tfW7M4saJuIV1fJvpNQ0u19O5Yez+PVlBXdFnlJANteBWTNtPv4P38rnPAscx1C0FCDV4xHK9pEbtQSLZv8svDjbcunosmu30c4xDJZ8zHyjlGzsjzJ4/Jca3GoqmlLIYpQSRxAA0Pmtc5zBSOa1p3ljY9y4QzN6OGtDbHnbVe3yrlJ22dLWNmY5rCQR2mniF0YtM6LD53s7QYbW5eK1DqtlPWRnOGl126nivR0eDS17A+eWMU7xrkOYnw8FJ3dO3nPHt4uKSMUxZuwXE9olcsJnfT43RvhJzGVrCBzBNiFk4zgb6GukhoZ2zxgnQ6GP+U8j5rswCmjoa9tViOpaOplFw095STt4Jhlt9FYbrnxGq6IHh7GuaQQRcEc13hd3Rivp3QkvpeHOI8D5dxXZDM2VuZvkQeIPcV3rGqInB2+hHXA6zfxj+6zrS+2QouuGRsjA5puCuxVBdNROyCJ8sh6rRc2XaViVrBLC+N3BwsbKXeulSmrmVJeGtc1zLXDhbirUVbILB1y53BrRcla6mhbSZyHucXcS7wSKcNEtaTd/Yhbzv3rhnyZYYzftvHGW9emRJiJacogkLvw81hOx129bEIN29x0Mh0+Cx2uqRXMfLJI6RpuQdF0Y2y1HTTPHGosfevJOfkvqu36eM+z0NHV9Ip2SkBpI1F+Cw5sVdHUOblZu2vDSS7XzUpSGQhrQA0DQBYTKSPEsW3TwGxRDPM8c+4L18uWWOM1e3HCS279NkMTEry2likmI5sGnquw1UzG5paWVg7yEY18gy0p3EI7Ibpp3la+rnngfkirnvJHJ4cPevPlz5zu10mEvTPixGCS9n2IFyDxVpq+OofkDXNJGYZhxC1TMJkqqMuL7Tm+Vw01XVs/IJAXuc7esJje0/dIK6cXNyZ2SxnPDGS2PTAouDDcLmvU4oiIiiqiqILzOIVmMR7QGlL5aenqWPjw97BG+N8oiLrSXGZpuHEciG+vplhtoaSmqJK17pMwLnl0073MjuNS0ONm8OVufeg17BiUW0NNA/E3zROjlmlh3LGsawWawXtmvd1731ylb5a/D58MrKqeroKmCeZzGRyuilDrNaXFotfTVzvVbBUVVREFVUVQVERBVHFVdbzog5U1nSOJ+7YBZL7HgvJ4jtGMLxSOBsW9YWXlsbEC+lvHis+faajipRMGSuJHVYQAU8om48ptpgFJNjxkifFHJNGHvYTYk3Ivb3LhQYOQxrA57y1uVr33ysF76X4+QWuxmtmxCufWSHLJcZcp7AHABel2frnYnSszkCZrt28957/Rea4S5bd+LkmXVYEgqYARJC7T7zQSPVYGzUlNVQVHTppxNvDkDCAAL87hfTm0sMlE+BhbkcwtuNePNfJMawKuwyulNOHNubkDVOaZY6sXCzLcde1DYWFhhcS5p0JOq9Ls/tGzDcIPSpHFz2ERMaC4l44af5wXkaegqKiTNWtceGU3sG66nx0utrQ1bsIxveup2OMsOWAvZow34/qnFxZeMz33bqPR+j54b/N1I2eF4nTT3zNeZCCQJAQSeZ1XbPYtK8wJ3VeNU8lPmc1rsua2h14fG581um1G/kbBEblxsCTYe8rtcbeS4YTev8qcvDrO48c3p6vZWZz8PLHEkRyFrb92h+q34XmsMraPDCygfITJfrP5Fx4/54LOlx6ljmdCwOkc0Xu3gvTjwcup9Lj+25resb323CLhFI2VuZhB77Hgua5uFmvbDkHR6jMP4cp18Hfr/nFZDTdSoi30LmcCRoe48iuqmk3kbXcCRqO4rI7yumUCy7r6LFqpAxhcTYAXKDXVd5ZWU0R68pt5DmukOhiqJJHOBhpB1R+Jy42eIHVhNpJnZYm+C66igfv4YI2SOAAdIcul18zkzuWXlp6cMZJp3YPHNPVSSVTTnc+5B5ArC2zlbFRxsboGVY+a9BFJupJpHtyu009y8ptVDWVVNJM2A5BKHg30S6xxWfVk3DHZYr8rK4ZGG4ZLOe3US2v4LV4dibayke0sMcrBZzCeC2UU7WYbSw65rlxXbn5Mbqz8OeGNm454hVObBuWizZDYnwCwqCkhqZZHAZXRNu0t0XOon6QYKdoN2lziU2fAkbXyE6RtH1Xkn1Zz7u16xrc1ANPRtfH2m2cbcgvK4RNl2ixCMHqvtIPNbusrL0dYb6Mi+q8zgJL8amkPOMLvjlrkxkYuP0Xb3MR6oXauiDsBd6+g8qIiIoqoqiC+afaJtR0h82C0gtFG8CeS/acPujwB+IX0tfAMUc52J1bn9ozvLvPMVYVvvs4lMe1dMN7kD2PaR+PqnT1APuX2NfCtlS5u0uGFnHpUY91xf4L7qlIqIiCqqKoCqiXQCbKRM3riT2QbW71gYridPh0O8qHG50axupcfBa2g2xohI2KphlgaXfxDYgeduCbkS2NFtxC6m2ic5wsyWJjmHlpp9FqN6SACSbcF9I2jwaHHqJrM4ZMzrQy2vbw8ivmmL4fXYNJkr4sjT2ZAbtd5H+655zV2xcbt1zPGUrtw+nMsL80oaw9YgnT0Wrmn/dl1x4eKyqWciFmcFpI5rnLDxyk22FHX1WEVAnopS2x6zL9V47iF9BrJXYlh9LUUtIybfMDgXGxZcd+i+YkvqJGwwNL5HmzWjmV9Lw1s1JhUFG0taY4g0vGuvMj3rtxXV7m43w5eOW9beeNDNV1klMQxjo+Ja8uaO/Q+nquNThT5a8QOmMjywguc24b327tPmvR4bQCkicMxe9xu5x5ldWD0rn1FTUzNIc52UXFjZfTnPJL4aknrr7vsfvNeVw1rGddfevLR4NNSxyvbTkta0AGwFjcEkjnzHosk0b6yEVMrRljbcFjrku5+/l9F6TF4Zp6UxUrb5nAON7ac1K3DZJKCGlpyAA4bwk6kcz53W8fmWyW6l3/w6Y/6jllMbdS2/wDiNPRYM2anZUVczRAxha12tyNbkX7ySeF7WCw8PwxlZWywU8rgwG1xcENHf/ZbnG3sikgpXv3dOxoJ/m4/2+KydnKXdwvqCzLvD1R3BbvyM8eO8lvv03fl8mHDly2+/U+3v/2z6GghoYd1AXgXuTmOp71kWeOy+/g4XXJF8rLK5XdfCyyyyvllewS2/iDL48QsWLqTzM5B9x79fqVlLpfCA4vjHWPEd6ym3bfRavFTeCRv8q2DXAha/EBcHTTms5zeNiy6u2urKlmSkY11nMYeOlis2mikuHTYqdeTZhotVUMZdrnND8vAFdcuMyUcLt3RU9hxLtV83GZy25SvVdWalbbFJGUzTlmdIXNBzOdckLRCopzR1IfV55ZQA2Kx6puue0NbHIaYxvZd0IDg08NVi1j4nPlnowABG37vMDVc+TP6rpvDHqOFC3d4hK38TAt26NpomODrSRuAtfiCtXRUzg3evcXyPsSStpTsjqKhjHGxOoXTLiyx48d/5tiZy5Vn0NA1zI5QDnBId5LVUTjh+G17ZbtkllytaRqRfivSS5Ww7uCUNkHe6xC8rjMFQS+Wpq4rjUB0gufIBXPHwxlk7Mb5XthVjaiWn3wfaKR4Zlv2ua7MBi/06ok/K0LHbM8U7XSOJjjuI2nvK2+CU5jibmHXcczvesfFx8uWX8Nc11hp6GDshd66ohZoXavqvEiIiKKqIiKvj23+CzYbjc9U2N3RKp5kZIBoHHVzT3G9z5L7CvE/anMDg9NSsBdK+oD8rRchoafqQrBoPs1wSaqxZuJyxkUtNctcRo99rADvtx9F9XXk/s1na7ZtkB6skMrw5p0Opve3vXrEoKqKoKiiqCri46LkuuTgg8RtbM9mNxF4BYIgWA8OJutDVyiTM42F+5exxmjhxOZ0UxI3WjHNOrSdT9FrY9lqVkgdLUyTtH3MuUHzXLKdreDO9z7tzs3jcUGB0kVUJd41lhpoRc218rLF2hro8ThySxtbAzU5+PryXKriaYrAAACwtyWlraerq4o2wxucy5Lzwvbglu5p2y4/DudtNDR4dFKJo+kAtNxlaB8br0GCTYZXWo6qnY2W/wC7ZIARbuB71r5mRwwiJ0TmzfeLlrZyWEPYS1zTcEcQVjHGY3bz5cuV6r6NSYbQ0GZ9PTxRG3WeBrbzXS/GYcxbSxSVDm8SwdUe9ZWHhmKYPA6obcTxNLwDbUjVdWMuZR0TaKjjAfKLBrRyX0eDHDKyWbv/AA9fxcOPPKY2bt/7TX5Y9PjVY9pqBRl1PbrWPZ9/NbyGdtTCx0WjXi58PBeSklroMOjgqXMjjDuu1lgXa8ePFZ02LRdGipsPlyPJG8efuL083xplrwn3+3rX9vd8j4cy1+njPfuetf29GcrG3Ng0D0WkxXaCGnZ/ojmyOaQXnkAumbGaoFxEDZKUMzFwBJI14jle3xWpewVBkfTRthL+w0C1u63j8DZOD4kl3yT/AD+2fi/Bky8uadf57bjDqt2J1rm1tIXR8Yn5Ltb36rKxSd7qmnoqVxYSQXFulgtJ+1aymw99KwWkbYNdbhcC49xJ18CsOIV9RTB0Gd0juqX2OZx53uu37beXldST1/8AXp/Z7z87qSdSfb/q94XNYzM5wDQNSSuMc8UrnNjka4t4gG9l4qrNdDQyROZKyEvszMTe9xb4X4aXWx2fpcQ3gc0shgFg42uXW5fqvNn8OY4XK5R4+T/T8cOK53OPUIiLwvmOmVuU5xw5/wB10ysEjVlkAix4FY7dHFp5FQauWj14aK0tBhssUsGIMbd5sHOcW6dwPetm5gIXSyIMc6ZwBEQu0Hm7kl7mj01lDgmFQSVElbPvmQv3Y3rx1TxtpxP6rTT076mqlbABFRl/Vbzyrc4XAJHVUUlrVEjtT+IHQ+vzXbFR5TYi1uK88+Px5Yzcdf1cpfbpp6cCMC2gCxquBw1YS1wNw4cQVvY4Q0cF1T04cCu9xlmr6c5bLt0Yc2kxOiFPiDwawXFy6xd3ELGoMLwOCjdV1RExeXZMzrE20s0LJZTimgmqbdctLI/C/E+nzWNhNJvMM6O5ouAJWedtR7x8lyvFh5Tpvzy1e2mpKJ8s29qCLA3YwcG/3Xo6KHKLkLjBSgW0WwjYGhaw48eOaxZyyuV3XNosFyQItsiIiKIoqg+b7d7X1bK6TDMLldAyLqzSsNnOdzAPID1XgXvdI8ve4ucTcucbkrNxRs1RiOIVIje5gqHukeGmzbuPE8lgrTLnFLJDI2SGR0b26hzDYj3r6LsFthUVdUzC8Vk3j3j9xO7tEj7ru/wK+brMiircONJiO5kjaXh8ErmkNcWm+hQffkXTSVDKqlhqI+xLG17fIi4XcsqqqiKirrk4LsXXJwQaKuvBVmQ9iTn4hTetI4rUbWVsnT4qSN5ayNokdY8XG9vh81juqzHTsImD3kai3Bc77d8OfGTWTa1UzXZWX0LgD6rPbkEQaG6968XLLVVc0ccZJkLwGNb+K+i9r+ysTiY0BjJjYXLHAWPPipO/TePNjlWk2iazopkNszdQV5ujpZ8Uqm09M0kk9Z1tGDvK+hM2fM8bnV4Y88oeI96yaKlgp4xHTQsiZ+FjbLUw37efm1nnuOL3/srCQKeMvELA1o8ALLzjKsYhPvq10weODYtTbu04L2jYw5ha4XBFipS0cFLGGQxhovfvK9/Bz4cWN67/AC9nxvk8fDhfp+r8/wBPLNwx9YWiKldDESLyynrFbSfZyjlLD1m5W2OXS/itxLxjH830Kqzn8vkt6ukz+fzWzxutNTUUfQsGlgpQXPIte1z3fJd2H4ZBAyCQxjfMZa/ctgi53myuOt+3G/IzuNx37u7/AG63wscxwDWguHGyxKOH9mYe7fODiy7nOA4rPXCeJs8L4n9l4sbLOOd1430xjyXXjfTyNbvsRlhfI/WV/wC7YDoAPpf6r1tPE2GFkTeDWgLAw7BYaGXe7x8rho3P90eC2a7/ACebHPWOHqPT8z5GPJrDj/jBEReV4hY83VlB7wshdFToWHzQUahcXgluXle9lyZwVIUGvoY/3RcOO8ef/cVmBtySdSeJXTQD/R/+Y/8ArKygs4fxjWXuoAuLm3XYuJWmWHX3FJITwYx1h7lYIt0GZdC0WBVxAXpXj8Ra31IH1XeAs/7mvs4taAuwBAFVWRRERRFEQFVFwmkEUL5DwY0u9EHz7A6Pp2xG0AAuX1Ej2+OUNcPiF89X1z7N4wdlhnFxLNITfny+i+T1UYhqZYmuDmseWhw5gFajLrX13aPBWnYMUmUbyip2yNPc5g63qM3qvmOAQsqMcw+GUgMfUxh1+7MF9n2kqoqLAa+efsCFzbd5IsB7yQlWMD7P6s1WytHmN3RZoj7jp8LL0a8r9m9JNSbMxmduXfyOlYD+EgAetr+9epUFVURAJWHW1JjsyMAyO7+AHespx0WnrHlldcmwc0ZT5KW6jpx4y5arVYnhAq53VEkjhOWgXtpp4LzlQ11PK6KTtN+K9pJKLFzjdeUxunkqaoSRFoaBlJN1yrXNxTx3J2mATxx47Qultl3oGvInQfGy+rB1hZfIo8MjjbvamcScw1mg95XsNnsdxCWntVQNkiGkcpdZzh4i2vmpxc2NvjHPHhzkerJWDBYkkcCSR6rX1mJ1L2gRRsa2/WBJJcO7wWVh1VHUsJZcOHaaeIXeWVbhljN1sGhclxauS0w6pe1H+b6FVSXtR/m+hVUBERAREQEREBERAXRV8Gea71j1fBnmoLHwC5FcI+C5koMag/2f/mP/AKyu9zrW4knQADUrGozaOQd0r/6ifqsuhGaSSQ/dORvhoCf88FjH+MjV90ENQRe0bfAkkrg/eRkCVoF+BBuCuMrKjEI3xudPRZJQWvjdq8BZ8jGyMcx40IsVZNzcS3V1WprDcQt/FM34a/RZIWE5xdPStd2mlzj5gW+qzQpjd21b105Ioi0yIiiKIiICwcek3OB4hJzbTSEf+krNWr2pv/2bxO3+7P8Akg0GA1n7K+zUVYNntjlLT/MXuDfiQvlq9ljlWYNgMEo2m3SHOe7xDSdPVw9F41ajNco3uje17CWuaQWkciF9OqJztpiFHRQk/s2nYyorHDg55Fwz5/HuXy9fWvsyqxU7PGIgZ6eUxk8yOIv6ke5KR61rWsaGsAa0CwAFgAuSiLKqqoiDhJwXl8WkMuJOYSbRAAWPAnUn5L08nBeVxpjoMQ3pHUlA18Ry+SmXprH2r2M3YtM9xPEcFiytbkIA0XISAjiumaUBp1WHW23201VHUPrYooWOdE4gyEfdF9V7ChrqVmWN7Syws0OFgtbhu6EYdICcwvpzKVAa5p00UmMl3FmdnTeSEEkgWXTQSGLFYw3g+7SPdf6LCoasmjaHm7mktufgs7CIXTVIqXCzGXDfErWPt0zs8HpWHRc11R8F2Ls8brl7Uf5voVVJe1H+b6FVQEREBERAREQEREBY9YdGeayFiVxs1vmg4SVDKeB0shs1o9VqpMbmBzCmbk5Au1K12O4rK6nldT028pqabLLLvADmA1AbxNrrHFY2aFr81xlFvKy5Xkluo6THrdb+gr4ZYpZA7KDKTlPEcFs8PnYHubmFpDmab6E8PovP4fNEaJmTL4nx5rJoTm3tv4ebTz5pj+G8+OSbele0uY5ty24IuOIXQ21FSAPkdKW6AuOrisFs9Q0WEzreIB+YXE5nuzSOLnd5Wrd3eu3F1xX6Y0E3LItfMn9FnNWHTi9VOe4Nb8L/AFWYFMJ0uTkiItIiIiAiiKAsbFKY1mGVdK215oXxi/eWkLIVQfHNr2S0kOD4dO3LJTUYL23vlc5xuPgF51b/AG7qOk7U1xB6sbmxj/haAfjdaBbjIvoP2S1FpMRpieLWSNHlcH5hfPl6v7M6jc7Tsjv/AB4Xs9Ot/wDFKR9cVURZVVVEQcXjRYFbTx1Ebopm5mn4HvWe46LR1tdLJO+GlAszRzrX15ptZNtTHhU0gBhnZlPDPpb0XbHg1n3qZg8D7rBYH3qRVclKWtkOeLgTbVq2Rlba91zevHHG9xoqx7KCq3IIyuGZrR90dyx6mss0gA37rLrxqRzMVMl9HNGU+SxJpzJdz3XJ5lTbycnJZlZHpdl+iV9O4PjtNEeu0uJBvzt6r1UMYFrCwGgAXithY3vrqqYX3QYGnuJvf/PNe9jbou2PpJlbO3JosFzUCq0OqXtR/m+hWFWVErK6mhhLiHBzpGtAvYcOPis2XtR/m+hXB9PC95e+GNzyLFxaCbdyxnLZqLLJe2sp8TkbSxyS3kfLne0GzQ1je+w4rskxbdjMackbtkhs/UBxtbhxWaaWmcxrDTxFrb5W5BYX42XVHh9PHO+YNBLrWBaLMtwy6aLl48s6lb3h+HU3E81Rudz/AN66IOD+YF1yosRbVyRsbGWl0RkNzw61l2U1DFTh5bdz3EkyOAza8dbJRUENGXGK5c4AEkDgPIBWTk3N1L4a6cJcQYyrZC1uZpDi+S+jco1810ftZxYXGENvAZm3fyB0vpzWWygpmVXSGRNa/LlsGgDz812NpoGNc1sMYa4WcA0WITx5L9zeH4aubEaiKWF8jbgQB8kbDoS42HHW/gs3E6ttNTS5ZAJgzM1vPjbh5ld/RqfKW7iLKQARkGoHBV8ET3Nc+JjnM7JLQbeSTDOSzZ5Y7nTC/aBie2GRpe5r2RvfoOs4X0HcueIGzW+aynQxGTemJm8/HlF/VYmI9lvmt4zKe6zbL6ebr9i6mrnMtLVFkFQQ+WG+lzx/wLPxLZiCnwU9HB6RAy5LSeuByt5LfUVYwwtY9wa5otrzXaaqEzMjDwSTy4KTjxl3C5WzVfPKPCqrLUyVstVQxNYN03dkb1xHeeFldksTnNXNQTy71kTrMeeOv/6vf4xHHUYbUxSAWkjc0DxtpbxXkdncCGGnO83eeJ5lcrhljnNV0mU8NV6JrVyy2VZwWPWyO3b44/4jmnLbl4ru5yW9Rp5doqejnnY2KSZ29OYtsALWHPyW1wvFabEoi+ncQWmz2OFnNK8PVRTUDejTBtjqHDn717DYGGmGGy1LGtdM+Qte7mAOA+vvWMPemd5eWq24ddW67K3K1zCOJ4rpaVtpyURFARREBFFUHwPEpzVYjVVBveWZ79fEkrHX3+amgqBaeCKQfzsDvmvk+w1JDV7UiGqijmia2QlkjQ5pt4Fa2mnmFtNl6g0u0WHSjgJ2g+RNj8CtnjNLFBt90WKJjIDVQgRNaA2xym1uFtV9bhghgFoYo4x3MaB8lbTTtRRFlVRERHXIbBeSfI6nqp4nus4ON9eIOoXqpjZpK+dUFXAdp6t+IxmVrtAzOW+XBc+TOY626YTbPxCpZHA9zjoBcrN2afBjAZGaoxmwFstyffdYONPoRA8wxtYCOFyfmtFstOYap7mvyMFzm/D4rz/rd9enaY2R9IxzC8Ip8K3NRC57nO6jmutIXW437vh4LxX7DJNzO4M7suvqs/G9p462eKoZTVBpmMy7zJ1SeZHhw9FkxV8VZTRmHLktyXe545XUcfD75MjAq2LDhHRviayIu0kb3n8V/mvXxnRfP6uxYbr2mESOkw6le/tGJpJPPRdcLtnKabBFAqtsuqXtR/m+hVUl7Uf5voVVAREQEREBERAREQCsKvHVb5rNWLXDqs81Bhhh5IWeCyGNuFyLAgwKm+WNxJOSRvE8Lm31WTGxKqHPTyNb2i028+S7IXCSNj28HNBHvWJ/KtfZToFqK+o3da1jAXOLOtrbmbfVbh/BaDGoXtmbURtLrjI5o4+BVy9LhdXbWYtEKwh0rexwbfj6LnstMW1Ej6abosYdk3WlnkcSb8fNcHiecFkULyedxaysksW4DQALC1guVx7ldPKb3Y30tTK2cSSSF4JAcDy8lsmHQLR00NRMIukNytABdc6krdR8F1m2eTx39LuUQIjmIoiAiiqCr5f9nzLbY1Q/BHL/AFAL6evnGwbMu2uKj8LJh/1GqwrH2iZ/rLp/5qmmP9I+i+or5ttEz/WVQeMkB+P6L6SlRUURFVCiIOmbgvn202BS9KNRTXD+OnNfQ3i4WFUQteMr23HLwWOTDzjWOXjXysU1fM9rJg5zb6gXFwtlU4b0XDah0ceQv1bFe5a2/C69FVjd1zomSODQAbaX9eK7i5hpjCGAB3acdSSvN+jfu6+caar2lpqnBoqUNjaI2ZQxrba/3WFs+ZIKOV0gLW7ywB0sddPRZc2DUe8Mph4a9V2n6L0eF4fFGwF4a3S4HG39z4qYceXl23O41NJCa+pZGXZIies8/IeK91TNDGNa0WaBYDuWjmja5pFrhZuB1DpGPheSXREWJPEFezC/Zz5OPU23I4Kri1cl0cHVL2o/zfQqqS9qP830KqgIiICIiAiIgIiICxq3st81krGruy3zUo4R8AuxdcfALsUVxKx6LqwGP2bnM9wOnwssgrHi6lXMzk8NePkfkFm+5Vnp3OWFVNvPA3+Yu9B+qzisUjPXeDIv6j/9Uy9EcC3vC6xTxbzebpuf8VhdZuQJkC0jpYw3Xe0WVDbLkEBEUUFRREBERBV8/wBjWZduscHcZh/1QvfrxGyzMu3eO/8AEfV4Ko6NoG3+0nC/ERn4u/svoC8Ljjb/AGlYT/4LT6F69ylFVURQVFFUEcvL7QVk8+KUuD0k4p3TgukmJtlb4FemedF4rbDDqmSqir6O+8Z1fPwXPltmPTWGt9tZtBQHBJd9RV0k7QesXm4d3rYUlWJqeOQ/fbf9F590eI4nIIqljw233Re58fBe4wTZqOpwxpmkezKLRuYeJ5nxHD0XDh3ctO2dkjUTzjKQCttQVjJoGuB5LQ4pQzYfVup6i5I1aeTh3hYAqahlSyChBdUScuQHeV2yymPtz4+X6tSPZyztDTqszAYiBJO4W3lsvkF4fFY8foGB1XkykXLAy1wt/sptIKxrYqjQjS/cmHLj5adeW2zp7VnBc11sOi7F6XldUvaj/N9CqpL2o/zfQqqAiIgIiICIiAiIgLGruw3zWSsWu7DfNSjhHwC7V1R8AuxRUKxqjqTwS8sxYfI/qAskroq2F9O9re0BdvmNR8Qs5elnt23WPT9aeof/ADho9wH1JXbG8SRte3g4AhdVDrTh/wCNzn+pJUvdhPVZIRQKrSCIogIiICIiAiIgLx+AMybe46P5Gn1ylewXl8Oa1n2gYtYgl9LG4gHh2QqMXFmZvtLwj/ypPpvV7NeTrGh/2kUJ/BQE/F4+q9WlFRRVQVFEQcJOCyaKGOSkLZGte15OYOFwViycF34bMMroj2gbjxCsK7BhGHg5ujAnuc4kehNllmw0CXUutak9I0O0+DyYsaZtNlEjHHM53ANP6hYGG7JVGFYk7EIKqGeUtsI5IiAPI3Xq6cixdxuT812uIKxlx45d0lsvT5xtPib3OlZWXbM3RzXcl5nZe7sRu3sOcfRev+0bCjV1dDNA28hDmyAfeAItf1PqsXBsJO+fZjGveevuxZsQPG3ce4LxZcdmdxndemZbx29rhkjpKGnc7tGNpPos0LGpmBjGtaLACwCyQvoR53XL2o/zfQqqS9qP830KqIIiICIiAiIgIiICxa/sN81lLFr+w3zUo64+AXauqPguxZUK4FUlYr6m5IhjdLY2JBAaD5kj4XUuUx7qyW+nWH7mmqWc4s2XyIuPnb3LKgbu4mM/C0D0WqqpJnSEhsIzABzd6bmxv3efqsmKrqHC7qGbKOLmEED1suGHLhvW3TLDLTYBF1QTMnZnjdcXsdLEHuI5LtXo9uQiIgIiICIiDGs72j/VLO9o/wBVURUs72j/AFWBTYLQ02Iy4hAx7auW+eTeuOa5udCbcgtgiDXVOCUNTiEeITRyGrjtklErgRbhwNlsLO9o/wBVUQSzvaP9Us72j/VVEEs72j/VLO9o/wBVUQcHNd7R/qsYh7HhzZHgjgbrMIXBzLoOyPFZmts9jX258F11GJVErS1gEYPMcV1GJTc+CbTTIwuvFMzc1BcW3u151t5rYSYlSMYXGZp8BqVpXRFdZhJV2aY+KzOxCp3ji5rAMrWX5eK4wOnjaGRSFjBwDbBZbaYcwuxsAHJTr2rrZUVQH+0P9Vz6VVf7w/1XYIQm6CDr6VVXBM7jbhdcumVXtvgFy3QTdIOPTKr23wCdMqvbfALluk3SDj0yq9t8AnTKr23wC5bpN0g49MqvbfAJ0yq9t8AuW6TdIOPTKr23wCdMqva/ALluk3QTYnTKn2vwCOmmmAD5HWC5boLk1lk2DA4D+I/1XOzvaP8AVAFUHB2b2j/VYBp3xOvE8OZfSOW5A8rEfVbAhdbmrGWGOc1lFmVnpgST4k27aaOihHe0G/yXQ6lr6o3qq0+4k/2WyLFyaxc/2/G3+pk66GlZSxZInv1N3EnUlZQDvaP9VGiy5hdpJJqOdu0s72j/AFSzvaP9VUVEs72j/VLO9o/1VRBLO9o/1RVEBERAREQEREBERAREQERECyWREEsplC5IgmUK2RECyWRECyWRECyWRECyWRECyWRECyWRECyIiAiIgWUIVRBxypZckQAEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERB//2Q=="
    },
    // A second booking on the same Saturday, so the Studio shows the clash and the
    // customer side shows the gold wall already out that day
    {
      id: ref(1002),
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      status: 'Deposit Paid',
      seenByAdmin: true,
      client: {
        name: 'Second Demo Customer',
        email: 'demo2@example.com',
        phone: '07700 900001',
        eventDate: upcomingSaturday(3),
        postcode: 'NG31 6AA',
        venueName: 'The Barn',
        accessTime: '12:00',
        setting: 'indoor',
        occasion: 'Prom',
        notes: 'A second demo order on the same day, to show how the Studio flags a clash.'
      },
      configuration: {
        palette: ['Obsidian Black', 'Chrome Gold', 'Chrome Silver', 'Pearl Ivory', 'Warm Taupe'],
        backdrop: 'Gold Sequin Shimmer Wall',
        backdropId: 'gold-shimmer',
        balloonLayout: '7ft Organic Garland (Up One Side)',
        balloonId: 'garland-7ft',
        shimmerSize: 'large',
        extraIds: [],
        subtotal: 180,
        estimatedTotal: 180,
        depositPaid: 90,
        balanceDue: 90
      },
      history: [{ at: new Date(Date.now() - 2 * 86400000).toISOString(), text: 'Deposit £90 received' }]
    }
  ];
}
