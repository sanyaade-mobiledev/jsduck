require 'jsduck/json_duck'
require 'jsduck/null_object'
require 'jsduck/grouped_asset'

module JsDuck

  # Reads in examples JSON file
  class Examples < GroupedAsset
    # Creates Examples object from filename.
    def self.create(filename, opts)
      if filename
        Examples.new(filename, opts)
      else
        NullObject.new(:to_array => [], :[] => nil)
      end
    end

    # Parses examples config file
    def initialize(filename, opts)
      @groups = JsonDuck.read(filename)
      @opts = opts
      fix_examples_data
      build_map_by_name("Two examples have the same name")
    end

    # Prefix all relative URL-s in examples list with path given in --examples-base-url
    #
    # For backwards compatibility:
    #
    # - Create names for each example when not present
    # - Create title from text
    # - Create description from desc
    #
    def fix_examples_data
      each_item do |ex|
        unless ex["url"] =~ /^https?:\/\//
          ex["url"] = @opts.examples_base_url + ex["url"]
          ex["name"] = ex["url"] unless ex["name"]
          unless ex["title"]
            ex["title"] = ex["text"]
            ex.delete("text")
          end
          unless ex["description"]
            ex["description"] = ex["desc"]
            ex.delete("desc")
          end
        end
      end
    end

    # Writes examples JSON file to dir
    def write(dir)
      FileUtils.mkdir(dir) unless File.exists?(dir)
      # Write the JSON to output dir, so it's available in released
      # version of docs and people can use it with JSDuck by themselves.
      JsonDuck.write_json(dir+"/examples.json", @groups)
    end

    # Extracts example icon URL from example hash
    def icon_url(example)
      @opts.examples_base_url + example["icon"]
    end

  end

end
