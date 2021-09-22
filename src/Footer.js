import React from 'react'
import { FaTwitter, FaTelegramPlane, FaMediumM, FaGithub, FaDiscord } from 'react-icons/fa'

import './Footer.css';

export default function Footer() {
  return(
    <div className="Footer">
      <a className="App-social-link" href="https://twitter.com/GMX_IO" target="_blank" rel="noopener noreferrer">
        <FaTwitter />
      </a>
      <a className="App-social-link" href="https://medium.com/@gmx.io" target="_blank" rel="noopener noreferrer">
        <FaMediumM />
      </a>
      <a className="App-social-link" href="https://github.com/xvi10" target="_blank" rel="noopener noreferrer">
        <FaGithub />
      </a>
      <a className="App-social-link" href="https://t.me/GMX_IO" target="_blank" rel="noopener noreferrer">
        <FaTelegramPlane />
      </a>
      <a className="App-social-link" href="https://discord.gg/cxjZYR4gQK" target="_blank" rel="noopener noreferrer">
        <FaDiscord />
      </a>
    </div>
  )
}
