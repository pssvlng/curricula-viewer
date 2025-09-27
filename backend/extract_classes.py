#!/usr/bin/env python3
"""
Extract class definitions from the lehrplan ontology TTL file.
This script parses the TTL file and extracts all class definitions with their labels.
"""

from rdflib import Graph, RDF, RDFS, OWL
import json
import os

def extract_classes_from_ttl(ttl_file_path):
    """Extract all class definitions from a TTL file"""
    
    # Load the TTL file
    graph = Graph()
    try:
        graph.parse(ttl_file_path, format='turtle')
        print(f"Successfully loaded {len(graph)} triples from {ttl_file_path}")
    except Exception as e:
        print(f"Error loading TTL file: {e}")
        return {}
    
    class_definitions = {}
    
    # Find all classes (both owl:Class and rdfs:Class)
    for subj, pred, obj in graph:
        if (pred == RDF.type and obj in [OWL.Class, RDFS.Class]) or pred == RDFS.subClassOf:
            class_uri = str(subj)
            
            if class_uri not in class_definitions:
                class_definitions[class_uri] = {
                    'uri': class_uri,
                    'german_label': None,
                    'english_label': None,
                    'comment': None
                }
    
    # Extract labels and comments for all classes
    for class_uri in class_definitions.keys():
        # Find labels
        for subj, pred, obj in graph:
            if str(subj) == class_uri:
                if pred == RDFS.label:
                    label = str(obj)
                    # Check if label has language tag
                    if obj.language == 'de':
                        class_definitions[class_uri]['german_label'] = label
                    elif obj.language == 'en':
                        class_definitions[class_uri]['english_label'] = label
                    elif not obj.language:
                        # No language tag - use as fallback
                        if not class_definitions[class_uri]['german_label']:
                            class_definitions[class_uri]['german_label'] = label
                        if not class_definitions[class_uri]['english_label']:
                            class_definitions[class_uri]['english_label'] = label
                
                elif pred == RDFS.comment:
                    comment = str(obj)
                    class_definitions[class_uri]['comment'] = comment
    
    return class_definitions

def main():
    # Look for lehrplan ontology TTL file
    ttl_files = [
        'lehrplan-ontology.ttl',
        'ontology.ttl',
        '../lehrplan-ontology.ttl',
        '../ontology.ttl'
    ]
    
    ttl_file = None
    for file_path in ttl_files:
        if os.path.exists(file_path):
            ttl_file = file_path
            break
    
    if not ttl_file:
        print("Error: Could not find lehrplan ontology TTL file")
        print("Looked for:", ttl_files)
        return
    
    print(f"Using TTL file: {ttl_file}")
    
    # Extract classes
    class_definitions = extract_classes_from_ttl(ttl_file)
    
    if not class_definitions:
        print("No classes found in TTL file")
        return
    
    print(f"Found {len(class_definitions)} class definitions")
    
    # Create references directory if it doesn't exist
    os.makedirs('references', exist_ok=True)
    
    # Save to JSON file
    output_file = 'references/class_definitions.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(class_definitions, f, ensure_ascii=False, indent=2)
    
    print(f"Saved class definitions to {output_file}")
    
    # Print some statistics
    classes_with_german_labels = sum(1 for c in class_definitions.values() if c['german_label'])
    classes_with_english_labels = sum(1 for c in class_definitions.values() if c['english_label'])
    
    print(f"Classes with German labels: {classes_with_german_labels}")
    print(f"Classes with English labels: {classes_with_english_labels}")
    
    # Show first few classes as examples
    print("\nFirst 5 class definitions:")
    for i, (uri, info) in enumerate(class_definitions.items()):
        if i >= 5:
            break
        print(f"  {uri}")
        if info['german_label']:
            print(f"    DE: {info['german_label']}")
        if info['english_label']:
            print(f"    EN: {info['english_label']}")

if __name__ == '__main__':
    main()
