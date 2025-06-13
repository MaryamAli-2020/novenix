import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { FileDown, FileText, FileCode, Mail, Copy, Book } from 'lucide-react';
import { useStory } from '../context/StoryContext';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import TextArea from '../components/ui/TextArea';

interface ExportProps {
  onNext?: () => void;
  onPrev?: () => void;
}

const Export: React.FC<ExportProps> = ({ onNext, onPrev }) => {
  const { state, dispatch } = useStory();
  const [submissionOptions, setSubmissionOptions] = useState({
    queryLetter: false,
    synopsis: false,
    sampleChapters: false,
    authorBio: false,
    marketingPlan: false,
  });
  const [copySuccess, setCopySuccess] = useState(false);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [queryDraft, setQueryDraft] = useState(state.queryLetter || '');
  const [querySaved, setQuerySaved] = useState(false);

  // Utility: Format character relationships
  const formatRelationships = (character: any) => {
    if (!character.relationships || character.relationships.length === 0) return 'None';
    return character.relationships.map((rel: any) => {
      const relatedChar = state.characters.find(c => c.id === rel.characterId);
      return `${relatedChar?.name || 'Unknown'} (${rel.relationshipType}${rel.description ? `: ${rel.description}` : ''})`;
    }).join('\n');
  };

  // Utility: Format array to string
  const formatArray = (arr: string[] | undefined) => {
    if (!arr || arr.length === 0) return 'None';
    return arr.join(', ');
  };

  // Generate manuscript content
  const generateManuscriptContent = () => {
    const content = [];
    
    // Title Page
    content.push(
      `${state.title || 'Untitled Story'}\n\n`,
      `By ${state.authorBio ? state.authorBio.split('\n')[0] : 'Anonymous'}\n\n`,
      `Genre: ${formatArray(state.genre)}\n`,
      `Target Audience: ${state.targetAudience || 'Not specified'}\n\n`,
      `Word Count: ${state.progress?.totalWords || 0}\n\n`
    );

    // Table of Contents
    content.push('Table of Contents\n\n');
    state.chapters?.forEach((chapter, index) => {
      content.push(`Chapter ${index + 1}: ${chapter.title}\n`);
    });
    content.push('\n\n');

    // Chapters
    state.chapters?.forEach((chapter, index) => {
      content.push(`Chapter ${index + 1}: ${chapter.title}\n\n`);
      content.push(`Synopsis: ${chapter.synopsis}\n`);
      content.push('Scenes:\n');
      chapter.scenes?.forEach(scene => {
        if (scene.title || scene.summary) {
          content.push(`- ${scene.title}\n${scene.summary}\n`);
        }
      });
      content.push('\n\n');
    });

    return content.join('');
  };

  // Generate story bible content
  const generateStoryBibleContent = () => {
    const content = [];
    
    // Story Overview
    content.push(
      `# ${state.title || 'Untitled Story'}\n\n`,
      `## Story Overview\n`,
      `Genre: ${formatArray(state.genre)}\n`,
      `Target Audience: ${state.targetAudience || 'Not specified'}\n`,
      `Premise: ${state.premise || 'Not specified'}\n`,
      `Themes: ${formatArray(state.themes)}\n`,
      `Tone: ${state.tone || 'Not specified'}\n\n`
    );

    // Plot Beats
    content.push(`## Plot Beats\n\n`);
    state.plotBeats?.forEach(beat => {
      content.push(
        `### ${beat.name}\n`,
        `Act: ${beat.act || 'Not specified'}\n`,
        `Description: ${beat.description || 'Not specified'}\n\n`
      );
    });
    state.plotBeats?.forEach(beat => {
      content.push(
        `### ${beat.name}\n`,
        `Act: ${beat.act || 'Not specified'}\n`,
        `Description: ${beat.description || 'Not specified'}\n\n`
      );
    });

    // World Building
    content.push(
      `## World Building\n`,
      `Time Period: ${state.setting.timePeriod || 'Not specified'}\n`,
      `World Type: ${state.setting.worldType || 'Not specified'}\n`,
      `Technology Level: ${state.setting.technologyLevel || 'Not specified'}\n`,
      `Languages: ${state.setting.languages || 'Not specified'}\n`,
      `Religion: ${state.setting.religion || 'Not specified'}\n`,
      `Customs: ${state.setting.customs || 'Not specified'}\n`,
      `Historical Events: ${state.setting.historicalEvents || 'Not specified'}\n`,
      `Myths & Legends: ${state.setting.myths || 'Not specified'}\n\n`,
      `### Locations\n`
    );

    state.locations?.forEach(location => {
      content.push(
        `#### ${location.name}\n`,
        `Description: ${location.description || 'Not specified'}\n`,
        `Importance: ${location.importance || 'Normal'}\n\n`
      );
    });

    // Characters
    content.push(`## Characters\n\n`);
    state.characters?.forEach(character => {
      content.push(
        `### ${character.name}\n`,
        `Role: ${character.role || 'Not specified'}\n`,
        `Age: ${character.age || 'Not specified'}\n`,
        `Gender: ${character.gender || 'Not specified'}\n`,
        `Occupation: ${character.occupation || 'Not specified'}\n`,
        `Physical Description: ${character.physicalDescription || 'Not specified'}\n`,
        `Personality Traits: ${formatArray(character.personalityTraits)}\n`,
        `Goals: ${character.goals || 'Not specified'}\n`,
        `Motivations: ${character.motivations || 'Not specified'}\n`,
        `Conflicts: ${character.conflicts || 'Not specified'}\n`,
        `Character Arc: ${character.arc || 'Not specified'}\n`,
        `Strengths: ${formatArray(character.strengths)}\n`,
        `Flaws: ${formatArray(character.flaws)}\n`,
        `Relationships:\n${formatRelationships(character)}\n\n`
      );
    });

    // Plot Structure
    content.push(
      `## Plot Structure\n`,
      `Structure Type: ${state.plotStructure || 'Not specified'}\n\n`,
      `### Plot Points\n`
    );

    state.plotPoints?.forEach(point => {
      content.push(
        `#### ${point.title}\n`,
        `Type: ${point.type}\n`,
        `Description: ${point.description}\n`,
        `Outcome: ${point.outcome}\n\n`
      );
    });

    // Themes and Symbols
    content.push(
      `## Themes and Symbols\n`,
      `Central Themes: ${formatArray(state.centralThemes)}\n`,
      `### Symbols\n`
    );

    state.symbols?.forEach(symbol => {
      content.push(
        `#### ${symbol.name}\n`,
        `Meaning: ${symbol.meaning}\n`,
        `Occurrences: ${formatArray(symbol.occurrences)}\n\n`
      );
    });

    // Research Notes
    content.push(`## Research Notes\n\n`);
    state.researchNotes?.forEach(note => {
      content.push(
        `### ${note.topic}\n`,
        `Content: ${note.content}\n`,
        `Sources: ${formatArray(note.sources)}\n`,
        `Tags: ${formatArray(note.tags)}\n\n`
      );
    });

    return content.join('');
  };

  // Export manuscript (PDF and Word)
  const handleExportManuscript = async (format: 'docx' | 'pdf' | 'html') => {
    const content = generateManuscriptContent();
    
    if (format === 'docx') {
      const doc = new Document({
        sections: [{
          properties: {},
          children: content.split('\n').map(para => 
            new Paragraph({
              children: [new TextRun(para)],
              spacing: { before: 200, after: 200 }
            })
          )
        }]
      });
      const blob = await Packer.toBlob(doc);
      downloadFile(`${state.title || 'manuscript'}.docx`, blob, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      const lines = doc.splitTextToSize(content, 180);
      doc.text(lines, 15, 15);
      doc.save(`${state.title || 'manuscript'}.pdf`);
    } else if (format === 'html') {
      const contentHtml = content.split('\n').map(para => {
        if (para.startsWith('#')) {
          const level = (para.match(/#/g) || []).length;
          const text = para.replace(/#/g, '').trim();
          return `<h${level}>${text}</h${level}>`;
        }
        return `<p>${para}</p>`;
      }).join('\n');

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${state.title || 'Manuscript'}</title>
    <style>
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 2;
            max-width: 8.5in;
            margin: 1in auto;
            padding: 20px;
            background: white;
        }
        .title-page {
            text-align: center;
            margin-bottom: 4in;
        }
        .title-page h1 {
            font-size: 20pt;
            margin-bottom: 2in;
        }
        .manuscript {
            text-indent: 0.5in;
        }
        .manuscript p {
            margin: 0;
            text-align: justify;
        }
        .manuscript h1, 
        .manuscript h2,
        .manuscript h3,
        .manuscript h4,
        .manuscript h5,
        .manuscript h6 {
            font-size: 12pt;
            font-weight: normal;
            text-align: center;
            margin: 2in 0 1in;
            page-break-before: always;
        }
        @media print {
            body {
                margin: 1in;
                max-width: none;
            }
            .manuscript {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    <div class="title-page">
        <h1>${state.title || 'Untitled Story'}</h1>
        <p>by</p>
        <p>${state.authorBio ? state.authorBio.split('\n')[0] : 'Anonymous'}</p>
        <p>Word Count: ${state.progress?.totalWords || 0}</p>
    </div>
    <div class="manuscript">
        ${contentHtml}
    </div>
</body>
</html>`;

      downloadFile(`${state.title || 'manuscript'}.html`, html, 'text/html');
    }
  };

  // Export story bible
  const handleExportStoryBible = async (format: 'pdf' | 'html' | 'docx') => {
    const content = generateStoryBibleContent();
    
    if (format === 'pdf') {
      const doc = new jsPDF();
      const lines = doc.splitTextToSize(content, 180);
      doc.text(lines, 15, 15);
      doc.save(`${state.title || 'story-bible'}.pdf`);
    } else if (format === 'docx') {
      const doc = new Document({
        sections: [{
          properties: {},
          children: content.split('\n').map(para => {
            if (para.startsWith('#')) {
              const level = (para.match(/#/g) || []).length;
              return new Paragraph({
                text: para.replace(/#/g, '').trim(),
                heading: level === 1 ? HeadingLevel.HEADING_1 :
                  level === 2 ? HeadingLevel.HEADING_2 :
                  level === 3 ? HeadingLevel.HEADING_3 :
                  level === 4 ? HeadingLevel.HEADING_4 :
                  level === 5 ? HeadingLevel.HEADING_5 :
                  HeadingLevel.HEADING_6
              });
            }
            return new Paragraph({ text: para });
          })
        }]
      });
      const blob = await Packer.toBlob(doc);
      downloadFile(`${state.title || 'story-bible'}.docx`, blob, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } else {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${state.title || 'Story Bible'}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1, h2, h3, h4 { color: #2c3e50; }
            hr { border: 0; border-top: 1px solid #eee; margin: 20px 0; }
          </style>
        </head>
        <body>
          ${content.replace(/\n/g, '<br>').replace(/#{4} (.*)/g, '<h4>$1</h4>').replace(/#{3} (.*)/g, '<h3>$1</h3>').replace(/#{2} (.*)/g, '<h2>$1</h2>').replace(/# (.*)/g, '<h1>$1</h1>')}
        </body>
        </html>
      `;
      downloadFile(`${state.title || 'story-bible'}.html`, html, 'text/html');
    }
  };

  // Export project data (JSON and HTML)
  const handleExportProjectData = () => {
    downloadFile('project-data.json', JSON.stringify(state, null, 2), 'application/json');
  };

  const handleExportProjectDataHTML = () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${state.title || 'Project'} - Project Data</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f8f9fa; }
        .section { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        h1, h2, h3, h4 { color: #2c3e50; }
        .property { margin: 10px 0; }
        .property-name { font-weight: 600; color: #4a5568; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        pre { background: #f1f3f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
        .subsection { margin: 15px 0; padding: 15px; background: #f8fafc; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>${state.title || 'Project'} - Project Data</h1>
    
    <div class="section">
        <h2>Story Overview</h2>
        <div class="property">
            <div class="property-name">Title</div>
            <div>${state.title || 'Untitled'}</div>
        </div>
        <div class="property">
            <div class="property-name">Genre</div>
            <div>${formatArray(state.genre)}</div>
        </div>
        <div class="property">
            <div class="property-name">Target Audience</div>
            <div>${state.targetAudience || 'Not specified'}</div>
        </div>
        <div class="property">
            <div class="property-name">Premise</div>
            <div>${state.premise || 'Not specified'}</div>
        </div>
        <div class="property">
            <div class="property-name">Themes</div>
            <div>${formatArray(state.themes)}</div>
        </div>
        <div class="property">
            <div class="property-name">Tone</div>
            <div>${state.tone || 'Not specified'}</div>
        </div>
    </div>

    <div class="section">
        <h2>Plot Structure</h2>
        <div class="property">
            <div class="property-name">Structure Type</div>
            <div>${state.plotStructure || 'Not specified'}</div>
        </div>
        
        <h3>Plot Beats</h3>
        <div class="grid">
            ${state.plotBeats?.map(beat => `
                <div class="subsection">
                    <h4>${beat.name}</h4>
                    <div class="property">
                        <div class="property-name">Act</div>
                        <div>${beat.act || 'Not specified'}</div>
                    </div>
                    <div class="property">
                        <div class="property-name">Description</div>
                        <div>${beat.description || 'Not specified'}</div>
                    </div>
                </div>
            `).join('') || 'No plot beats defined'}
        </div>

        <h3>Plot Points</h3>
        <div class="grid">
            ${state.plotPoints?.map(point => `
                <div class="subsection">
                    <h4>${point.title}</h4>
                    <div class="property">
                        <div class="property-name">Type</div>
                        <div>${point.type || 'Not specified'}</div>
                    </div>
                    <div class="property">
                        <div class="property-name">Description</div>
                        <div>${point.description || 'Not specified'}</div>
                    </div>
                    <div class="property">
                        <div class="property-name">Characters</div>
                        <div>${formatArray(point.characters)}</div>
                    </div>
                    <div class="property">
                        <div class="property-name">Location</div>
                        <div>${point.location || 'Not specified'}</div>
                    </div>
                    <div class="property">
                        <div class="property-name">Outcome</div>
                        <div>${point.outcome || 'Not specified'}</div>
                    </div>
                </div>
            `).join('') || 'No plot points defined'}
        </div>
    </div>

    <div class="section">
        <h2>Characters</h2>
        <div class="grid">
            ${state.characters?.map(char => `
                <div class="subsection">
                    <h4>${char.name}</h4>
                    <div class="property">
                        <div class="property-name">Role</div>
                        <div>${char.role || 'Not specified'}</div>
                    </div>
                    <div class="property">
                        <div class="property-name">Age</div>
                        <div>${char.age || 'Not specified'}</div>
                    </div>
                    <div class="property">
                        <div class="property-name">Goals</div>
                        <div>${char.goals || 'Not specified'}</div>
                    </div>
                    <div class="property">
                        <div class="property-name">Personality Traits</div>
                        <div>${formatArray(char.personalityTraits)}</div>
                    </div>
                    <div class="property">
                        <div class="property-name">Strengths</div>
                        <div>${formatArray(char.strengths)}</div>
                    </div>
                    <div class="property">
                        <div class="property-name">Flaws</div>
                        <div>${formatArray(char.flaws)}</div>
                    </div>
                </div>
            `).join('') || 'No characters defined'}
        </div>
    </div>

    <div class="section">
        <h2>World Building</h2>
        <div class="property">
            <div class="property-name">Time Period</div>
            <div>${state.setting.timePeriod || 'Not specified'}</div>
        </div>
        <div class="property">
            <div class="property-name">World Type</div>
            <div>${state.setting.worldType || 'Not specified'}</div>
        </div>
        <div class="property">
            <div class="property-name">Technology Level</div>
            <div>${state.setting.technologyLevel || 'Not specified'}</div>
        </div>
        
        <h3>Locations</h3>
        <div class="grid">
            ${state.locations?.map(loc => `
                <div class="subsection">
                    <h4>${loc.name}</h4>
                    <div class="property">
                        <div class="property-name">Description</div>
                        <div>${loc.description || 'Not specified'}</div>
                    </div>
                    <div class="property">
                        <div class="property-name">Importance</div>
                        <div>${loc.importance || 'Not specified'}</div>
                    </div>
                </div>
            `).join('') || 'No locations defined'}
        </div>
    </div>

    <div class="section">
        <h2>Themes & Symbols</h2>
        <div class="property">
            <div class="property-name">Central Themes</div>
            <div>${formatArray(state.centralThemes)}</div>
        </div>
        
        <h3>Symbols</h3>
        <div class="grid">
            ${state.symbols?.map(symbol => `
                <div class="subsection">
                    <h4>${symbol.name}</h4>
                    <div class="property">
                        <div class="property-name">Meaning</div>
                        <div>${symbol.meaning || 'Not specified'}</div>
                    </div>
                    <div class="property">
                        <div class="property-name">Occurrences</div>
                        <div>${formatArray(symbol.occurrences)}</div>
                    </div>
                </div>
            `).join('') || 'No symbols defined'}
        </div>
    </div>

    <div class="section">
        <h2>Chapters</h2>
        <div class="grid">
            ${state.chapters?.map((chapter, index) => `
                <div class="subsection">
                    <h4>Chapter ${index + 1}: ${chapter.title}</h4>
                    <div class="property">
                        <div class="property-name">Synopsis</div>
                        <div>${chapter.synopsis || 'Not specified'}</div>
                    </div>
                    <div class="property">
                        <div class="property-name">Goal</div>
                        <div>${chapter.goal || 'Not specified'}</div>
                    </div>
                    <div class="property">
                        <div class="property-name">POV</div>
                        <div>${chapter.pov || 'Not specified'}</div>
                    </div>
                    <div class="property">
                        <div class="property-name">Word Count Goal</div>
                        <div>${chapter.wordCountGoal || 'Not specified'}</div>
                    </div>
                </div>
            `).join('') || 'No chapters defined'}
        </div>
    </div>

    <div class="section">
        <h2>Research Notes</h2>
        <div class="grid">
            ${state.researchNotes?.map(note => `
                <div class="subsection">
                    <h4>${note.topic}</h4>
                    <div class="property">
                        <div class="property-name">Content</div>
                        <div>${note.content || 'Not specified'}</div>
                    </div>
                    <div class="property">
                        <div class="property-name">Sources</div>
                        <div>${formatArray(note.sources)}</div>
                    </div>
                    <div class="property">
                        <div class="property-name">Tags</div>
                        <div>${formatArray(note.tags)}</div>
                    </div>
                </div>
            `).join('') || 'No research notes defined'}
        </div>
    </div>

    <div class="section">
        <h2>Progress</h2>
        <div class="grid">
            <div class="subsection">
                <div class="property">
                    <div class="property-name">Total Words</div>
                    <div>${state.progress?.totalWords || 0}</div>
                </div>
                <div class="property">
                    <div class="property-name">Chapters Planned</div>
                    <div>${state.progress?.chaptersPlanned || 0}</div>
                </div>
                <div class="property">
                    <div class="property-name">Chapters Completed</div>
                    <div>${state.progress?.chaptersCompleted || 0}</div>
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Raw Data</h2>
        <pre>${JSON.stringify(state, null, 2)}</pre>
    </div>
</body>
</html>`;
    downloadFile(`${state.title || 'project'}-data.html`, html, 'text/html');
  };



  // Export project data to clipboard
  const handleCloneProject = () => {
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 800);
  };

  // Handle submission options change
  const handleSubmissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSubmissionOptions(prev => ({ ...prev, [name]: checked }));
  };

  // Generate submission package (PDF)
  const handleGenerateSubmission = async () => {
    const { queryLetter, synopsis, sampleChapters, authorBio, marketingPlan } = submissionOptions;
    const pdf = new jsPDF();
    const title = state.title || 'Untitled Story';
    const author = state.authorBio ? state.authorBio.split('\n')[0] : 'Anonymous';
    const wordCount = state.progress?.totalWords || 0;

    // Title Page
    pdf.setFontSize(22).text(title, 20, 30, { align: 'center' });
    pdf.setFontSize(16).text(`By ${author}`, 20, 50, { align: 'center' });
    pdf.setFontSize(12).text(`Word Count: ${wordCount}`, 20, 60, { align: 'center' });
    pdf.addPage();

    // Table of Contents
    pdf.setFontSize(18).text('Table of Contents', 20, 30);
    pdf.setFontSize(12);
    let tocContent = [];
    if (queryLetter) tocContent.push(['Query Letter', '']);
    if (synopsis) tocContent.push(['Synopsis', '']);
    if (sampleChapters) tocContent.push(['Sample Chapters', '']);
    if (authorBio) tocContent.push(['Author Bio', '']);
    if (marketingPlan) tocContent.push(['Marketing Plan', '']);
    tocContent.forEach((item, index) => {
      pdf.text(`${item[0]} .................................................. ${index + 2}`, 20, 40 + index * 10);
    });
    pdf.addPage();

    // Query Letter
    if (queryLetter) {
      pdf.setFontSize(16).text('Query Letter', 20, 30);
      pdf.setFontSize(12).text(state.queryLetter || 'No query letter provided.', 20, 40);
      pdf.addPage();
    }

    // Synopsis
    if (synopsis) {
      pdf.setFontSize(16).text('Synopsis', 20, 30);
      pdf.setFontSize(12).text(state.premise || 'No synopsis provided.', 20, 40);
      pdf.addPage();
    }

    // Sample Chapters
    if (sampleChapters) {
      pdf.setFontSize(16).text('Sample Chapters', 20, 30);
      state.chapters?.forEach((chapter, index) => {
        pdf.setFontSize(14).text(`Chapter ${index + 1}: ${chapter.title}`, 20, 40 + index * 60);
        pdf.setFontSize(12).text(chapter.synopsis || 'No synopsis provided.', 20, 50 + index * 60);
        chapter.scenes?.forEach((scene, sIndex) => {
          if (scene.title || scene.summary) {
            pdf.text(`- ${scene.title}`, 30, 60 + index * 60 + sIndex * 10);
            pdf.text(scene.summary, 40, 65 + index * 60 + sIndex * 10);
          }
        });
        pdf.addPage();
      });
    }

    // Author Bio
    if (authorBio) {
      pdf.setFontSize(16).text('Author Bio', 20, 30);
      pdf.setFontSize(12).text(state.authorBio || 'No author bio provided.', 20, 40);
      pdf.addPage();
    }

    // Marketing Plan
    if (marketingPlan) {
      pdf.setFontSize(16).text('Marketing Plan', 20, 30);
      pdf.setFontSize(12).text(state.marketingPlan || 'No marketing plan provided.', 20, 40);
      pdf.addPage();
    }

    // Save PDF
    pdf.save(`${title}-Submission-Package.pdf`);
  };

  // Save query letter draft
  const handleSaveQueryLetter = () => {
    dispatch({ type: 'UPDATE_CONCEPT', payload: { queryLetter: queryDraft } });
    setQuerySaved(true);
    setTimeout(() => setShowQueryModal(false), 800);
  };

  // Copy query letter template
  const handleCopyTemplate = async () => {
    const template = `[Agent's Name]
[Agency Name]
[Address]

Dear [Agent's Name],

[Hook: One-sentence description of your book that captures its essence and entices the reader.]

[Paragraph 1: Brief overview of your story, including main character, conflict, setting, and stakes. 2-3 sentences.]

[Paragraph 2: More details about the plot and what makes your book unique. 3-4 sentences.]

[Paragraph 3: Book details - title, word count, genre, and comp titles. "My [genre] novel, [TITLE], is complete at [word count] words and will appeal to fans of [comp title 1] and [comp title 2]."]

[Paragraph 4: Brief relevant bio. Writing credentials, expertise related to your book's subject matter, or anything else relevant.]

Thank you for your time and consideration.

Sincerely,
[Your Name]
[Your Email]
[Your Phone]`;
    await navigator.clipboard.writeText(template);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 1500);
  };

  // Query letter modal handlers
  const handleOpenQueryModal = () => {
    setQueryDraft(state.queryLetter || '');
    setShowQueryModal(true);
    setQuerySaved(false);
  };

  const handleCloseQueryModal = () => {
    setShowQueryModal(false);
    setQuerySaved(false);
  };

  // Utility: Download file
  const downloadFile = (filename: string, content: string | Blob, type: string) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handler to open external links
  const handleOpenExternal = (url: string) => {
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-slate-800">Export & Publish</h1>
        <Button variant="primary" icon={<FileDown size={16} />} onClick={handleExportProjectData} aria-label="Export all project data as JSON">Export Project</Button>
      </div>
      <p className="text-slate-600">
        Export your completed story and planning materials in various formats for publishing, submission, or backup purposes.
      </p>
      <Card title="Export Options">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="flex items-start">
              <div className="mr-3 mt-0.5">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                  <FileText size={20} />
                </div>
              </div>
              <div>
                <h3 className="font-medium text-slate-800">Manuscript</h3>
                <p className="text-xs text-slate-500 mt-1">Export your full manuscript</p>
                <div className="mt-3 space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    icon={<FileDown size={14} />} 
                    onClick={() => handleExportManuscript('docx')}
                    aria-label="Export manuscript as Word document"
                  >
                    Word (.docx)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    icon={<FileDown size={14} />} 
                    onClick={() => handleExportManuscript('pdf')}
                    aria-label="Export manuscript as PDF"
                  >
                    PDF (.pdf)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    icon={<FileDown size={14} />} 
                    onClick={() => handleExportManuscript('html')}
                    aria-label="Export manuscript as HTML"
                  >
                    HTML (.html)
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="flex items-start">
              <div className="mr-3 mt-0.5">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                  <Book size={20} />
                </div>
              </div>
              <div>
                <h3 className="font-medium text-slate-800">Story Bible</h3>
                <p className="text-xs text-slate-500 mt-1">Export all planning materials</p>
                <div className="mt-3 space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    icon={<FileDown size={14} />} 
                    onClick={() => handleExportStoryBible('pdf')}
                    aria-label="Export story bible as PDF"
                  >
                    PDF (.pdf)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    icon={<FileDown size={14} />} 
                    onClick={() => handleExportStoryBible('docx')}
                    aria-label="Export story bible as Word document"
                  >
                    Word (.docx)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    icon={<FileDown size={14} />} 
                    onClick={() => handleExportStoryBible('html')}
                    aria-label="Export story bible as HTML"
                  >
                    HTML (.html)
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="flex items-start">
              <div className="mr-3 mt-0.5">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                  <FileCode size={20} />
                </div>
              </div>
              <div>
                <h3 className="font-medium text-slate-800">Project Data</h3>
                <p className="text-xs text-slate-500 mt-1">Export project for backup</p>
                <div className="mt-3 space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    icon={<FileDown size={14} />} 
                    onClick={handleExportProjectData}
                    aria-label="Export project data as JSON"
                  >
                    JSON (.json)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    icon={<FileDown size={14} />} 
                    onClick={() => handleExportProjectDataHTML()}
                    aria-label="Export project data as HTML"
                  >
                    HTML (.html)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    icon={<Copy size={14} />} 
                    onClick={handleCloneProject}
                    aria-label="Copy project data to clipboard"
                  >
                    {copySuccess ? 'Copied!' : 'Clone Project'}
                  </Button>

                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Submission Package">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Generate a submission package for agents or publishers that includes all necessary materials.
            </p>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  id="query-letter"
                  name="queryLetter"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={submissionOptions.queryLetter}
                  onChange={handleSubmissionChange}
                />
                <label htmlFor="query-letter" className="ml-2 block text-sm text-slate-700">
                  Query Letter
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="synopsis"
                  name="synopsis"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={submissionOptions.synopsis}
                  onChange={handleSubmissionChange}
                />
                <label htmlFor="synopsis" className="ml-2 block text-sm text-slate-700">
                  Synopsis (1-2 pages)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="sample-chapters"
                  name="sampleChapters"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={submissionOptions.sampleChapters}
                  onChange={handleSubmissionChange}
                />
                <label htmlFor="sample-chapters" className="ml-2 block text-sm text-slate-700">
                  Sample Chapters
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="author-bio"
                  name="authorBio"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={submissionOptions.authorBio}
                  onChange={handleSubmissionChange}
                />
                <label htmlFor="author-bio" className="ml-2 block text-sm text-slate-700">
                  Author Bio
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="marketing-plan"
                  name="marketingPlan"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={submissionOptions.marketingPlan}
                  onChange={handleSubmissionChange}
                />
                <label htmlFor="marketing-plan" className="ml-2 block text-sm text-slate-700">
                  Marketing Plan
                </label>
              </div>
            </div>
            <div className="pt-3">
              <Button 
                variant="primary" 
                icon={<FileDown size={16} />} 
                onClick={handleGenerateSubmission}
                aria-label="Generate submission package"
              >
                Generate Submission Package
              </Button>
            </div>
          </div>
        </Card>
        <Card title="Query Letter Template">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Use this template to create a compelling query letter for agents or publishers.
            </p>
            <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 space-y-3">
              <p><strong>[Agent's Name]</strong><br/>[Agency Name]<br/>[Address]</p>
              <p>Dear [Agent's Name],</p>
              <p>
                [Hook: One-sentence description of your book that captures its essence 
                and entices the reader.]
              </p>
              <p>
                [Paragraph 1: Brief overview of your story, including main character, 
                conflict, setting, and stakes. 2-3 sentences.]
              </p>
              <p>
                [Paragraph 2: More details about the plot and what makes your book unique. 
                3-4 sentences.]
              </p>
              <p>
                [Paragraph 3: Book details - title, word count, genre, and comp titles. 
                "My [genre] novel, [TITLE], is complete at [word count] words and will appeal 
                to fans of [comp title 1] and [comp title 2]."]
              </p>
              <p>
                [Paragraph 4: Brief relevant bio. Writing credentials, expertise related to 
                your book's subject matter, or anything else relevant.]
              </p>
              <p>
                Thank you for your time and consideration.
              </p>
              <p>
                Sincerely,<br/>
                [Your Name]<br/>
                [Your Email]<br/>
                [Your Phone]
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                icon={<Copy size={16} />} 
                onClick={handleCopyTemplate}
                aria-label="Copy query letter template"
              >
                {copySuccess ? 'Copied!' : 'Copy Template'}
              </Button>
              <Button 
                variant="outline" 
                icon={<Mail size={16} />} 
                aria-label="Create query letter"
                onClick={handleOpenQueryModal}
              >
                Create Query Letter
              </Button>
            </div>
            {/* Modal for editing query letter */}
            {showQueryModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
                  <h2 className="text-lg font-bold mb-2">Edit Query Letter</h2>
                  <TextArea
                    value={queryDraft}
                    onChange={e => setQueryDraft(e.target.value)}
                    rows={12}
                    className="w-full mb-4"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleCloseQueryModal}>Cancel</Button>
                    <Button variant="primary" onClick={handleSaveQueryLetter}>Save</Button>
                  </div>
                  {querySaved && <div className="text-green-600 mt-2">Saved!</div>}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
      <Card title="Publishing Options">
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-slate-800">Traditional Publishing</h3>
              <p className="text-sm text-slate-600">
                Submitting your manuscript to publishers or literary agents who will handle 
                the publishing process.
              </p>
              
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Advantages</h4>
                <ul className="text-sm space-y-1 text-slate-600">
                  <li>• Professional editing, design, and marketing</li>
                  <li>• No upfront costs to the author</li>
                  <li>• Wider distribution and bookstore presence</li>
                  <li>• Publishing industry expertise</li>
                </ul>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Considerations</h4>
                <ul className="text-sm space-y-1 text-slate-600">
                  <li>• Highly competitive market</li>
                  <li>• Lower royalty percentages</li>
                  <li>• Less creative control</li>
                  <li>• Lengthy publishing timeline (1-2 years+)</li>
                </ul>
              </div>
              
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => handleOpenExternal('https://querytracker.net/publisher.php')}
                aria-label="View Agent & Publisher Directory"
              >
                View Agent & Publisher Directory
              </Button>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-slate-800">Self-Publishing</h3>
              <p className="text-sm text-slate-600">
                Publishing your book independently, maintaining complete control over the process 
                and retaining all rights.
              </p>
              
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Advantages</h4>
                <ul className="text-sm space-y-1 text-slate-600">
                  <li>• Complete creative control</li>
                  <li>• Higher royalty percentages</li>
                  <li>• Faster publishing timeline</li>
                  <li>• Retain all rights to your work</li>
                </ul>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Considerations</h4>
                <ul className="text-sm space-y-1 text-slate-600">
                  <li>• Upfront costs for editing, design, etc.</li>
                  <li>• Self-marketing responsibility</li>
                  <li>• Limited physical bookstore presence</li>
                  <li>• Managing all aspects of publication</li>
                </ul>
              </div>
              
              <Button 
                variant="outline" 
                className="mt-2"
                
                onClick={() => handleOpenExternal('https://www.janefriedman.com/self-publishing-resources/')}
                aria-label="View Self-Publishing Guide"
              >
                View Self-Publishing Guide
              </Button>
            </div>
          </div>
          
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="font-medium text-indigo-800 mb-2">Next Steps</h3>
            <p className="text-sm text-indigo-700">
              Regardless of your publishing path, these steps will help prepare your manuscript:
            </p>
            <ul className="text-sm space-y-1 text-indigo-700 mt-2">
              <li>1. Complete final manuscript revisions</li>
              <li>2. Hire a professional editor for developmental and copy editing</li>
              <li>3. Create a compelling synopsis and query letter (if pursuing traditional publishing)</li>
              <li>4. Research agents or publishers who represent your genre</li>
              <li>5. Develop a marketing plan and author platform</li>
            </ul>
          </div>
        </div>
      </Card>
      
      <div className="flex justify-between items-center pt-4">
        <div className="text-sm text-slate-500">
          <span className="font-medium">Progress: </span>
          <span className="text-indigo-600 font-bold">0%</span>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onPrev}
            aria-label="Go to previous section"
            title="Previous: Feedback & Drafting"
          >
            Previous: Feedback & Drafting
          </Button>
          <Button 
            variant="primary" 
            onClick={onNext}
            aria-label="Return to dashboard"
            title="Return to Dashboard"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Export;