/**
 * @module hooks/use-okf-data
 * @description React hook to parse local OKF directories using File System APIs or File lists.
 */

import { useState, useCallback } from 'react';
import type {
  CareerBundleData,
  SkillDoc,
  ExperienceDoc,
  PreferenceDoc,
  ApplicationDoc,
} from '../types/career.js';
import { parseOKFContent, parseLogEntries } from '../lib/okf-parser.js';

export function useOKFData() {
  const [data, setData] = useState<CareerBundleData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Traverse a flat list of File objects (e.g. from <input type="file" webkitdirectory />)
   * and parse files that match OKF paths.
   */
  const loadFromFiles = useCallback(async (files: File[]) => {
    setLoading(true);
    setError(null);

    const bundle: CareerBundleData = {
      skills: [],
      experiences: [],
      preferences: [],
      applications: [],
      other: [],
      logEntries: [],
    };

    try {
      for (const file of files) {
        // Derive category and concept name from relative path or name
        // webkitRelativePath contains the path starting with the root folder name: e.g. "my-okf/skills/typescript.md"
        const pathParts = file.webkitRelativePath.split('/');
        // We look for parts after the parent bundle root folder
        const mdIndex = pathParts.findIndex(p => p.endsWith('.md'));
        if (mdIndex === -1) continue;

        const category = pathParts[mdIndex - 1] || 'root';
        const fileName = pathParts[mdIndex]!;

        const content = await file.text();

        if (fileName === 'log.md') {
          bundle.logEntries = parseLogEntries(content);
          continue;
        }

        if (fileName === 'index.md') {
          continue; // skip indexes
        }

        const parsed = parseOKFContent(content, fileName, category);

        // Group by type
        const type = parsed.frontmatter.type?.toLowerCase();

        if (type === 'skill') {
          bundle.skills.push(parsed as SkillDoc);
        } else if (type === 'experience') {
          bundle.experiences.push(parsed as ExperienceDoc);
        } else if (type === 'preference') {
          bundle.preferences.push(parsed as PreferenceDoc);
        } else if (type === 'application') {
          bundle.applications.push(parsed as ApplicationDoc);
        } else {
          bundle.other.push(parsed);
        }
      }

      // Sort logs newest first
      bundle.logEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setData(bundle);
    } catch (err: unknown) {
      console.error('[useOKFData] Error loading files:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse folder content');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Traverse a DirectoryHandle (FileSystemAccess API) recursively and parse files.
   */
  const loadFromDirectory = useCallback(async (dirHandle: FileSystemDirectoryHandle) => {
    setLoading(true);
    setError(null);

    const bundle: CareerBundleData = {
      skills: [],
      experiences: [],
      preferences: [],
      applications: [],
      other: [],
      logEntries: [],
    };

    try {
      async function walk(handle: FileSystemDirectoryHandle, category: string) {
        for await (const entry of (handle as any).values()) {
          if (entry.kind === 'directory') {
            await walk(entry, entry.name);
          } else if (entry.kind === 'file' && entry.name.endsWith('.md')) {
            const file = await entry.getFile();
            const content = await file.text();

            if (entry.name === 'log.md') {
              bundle.logEntries = parseLogEntries(content);
              continue;
            }

            if (entry.name === 'index.md') {
              continue;
            }

            const parsed = parseOKFContent(content, entry.name, category);
            const type = parsed.frontmatter.type?.toLowerCase();

            if (type === 'skill') {
              bundle.skills.push(parsed as SkillDoc);
            } else if (type === 'experience') {
              bundle.experiences.push(parsed as ExperienceDoc);
            } else if (type === 'preference') {
              bundle.preferences.push(parsed as PreferenceDoc);
            } else if (type === 'application') {
              bundle.applications.push(parsed as ApplicationDoc);
            } else {
              bundle.other.push(parsed);
            }
          }
        }
      }

      await walk(dirHandle, 'root');
      setData(bundle);
    } catch (err: unknown) {
      console.error('[useOKFData] Error loading directory:', err);
      setError(err instanceof Error ? err.message : 'Failed to access directory');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    loadFromFiles,
    loadFromDirectory,
    setData,
  };
}
