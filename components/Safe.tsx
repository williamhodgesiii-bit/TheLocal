"use client";

import { Component, type ReactNode } from "react";
import { isStaleBuild, reloadForNewVersion, reportCrash } from "@/lib/recover";

/**
 * Keeps one bad piece (a feed post, a shelf) from taking the whole page down: if it breaks, it
 * quietly steps aside and the rest of the page carries on. If the cause is an old version left
 * open across a deploy, it reloads into the new one instead.
 */
export default class Safe extends Component<{ children: ReactNode; where?: string }, { broken: boolean }> {
  state = { broken: false };
  static getDerivedStateFromError() {
    return { broken: true };
  }
  componentDidCatch(error: unknown) {
    if (isStaleBuild(error) && reloadForNewVersion()) return;
    reportCrash(error, this.props.where ?? "section");
  }
  render() {
    return this.state.broken ? null : this.props.children;
  }
}
