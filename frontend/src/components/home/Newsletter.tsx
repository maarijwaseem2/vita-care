'use client';

import { useState } from 'react';
import styles from './home.module.css';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setDone(true);
  };

  return (
    <section className="section-tight">
      <div className="container">
        <div className={styles.news}>
          <h2>Get a health update every week</h2>
          <p>
            Practical tips from our doctors, straight to your inbox. No spam,
            unsubscribe anytime.
          </p>
          {done ? (
            <p style={{ color: '#7ff0b0', fontWeight: 600 }}>
              Thanks for subscribing! 🎉
            </p>
          ) : (
            <form className={styles.newsForm} onSubmit={submit}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Email address"
              />
              <button type="submit" className="btn btn-accent">
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
